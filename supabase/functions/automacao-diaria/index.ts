// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { criarClienteServico } from '../_shared/auth.ts'
import {
  aplicarVariaveis,
  obterSaudacaoBrasil,
  processarIniciarViagem,
} from '../_shared/viagem.ts'
import { evolutionEnviarTexto } from '../_shared/evolution.ts'

interface Detalhe {
  motorista_id: string
  /** Cenário 1: quantas rotas tiveram viagem CRIADA agora (envio inicial) */
  rotas_iniciadas: number
  /** Cenário 2: total de pendentes que receberam reenvio com sucesso */
  pendentes_reenviados: number
  /** Cenário 2: rotas com viagem existente cujos pendentes já foram todos respondidos */
  rotas_sem_pendentes: number
  erros: { rota_id: string; erro: string }[]
}

const TIME_ZONE_BR = 'America/Sao_Paulo'

function formatarDataBR(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    timeZone: TIME_ZONE_BR,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function obterAgoraBrasil(date = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE_BR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const get = (type: string) =>
    partes.find((p) => p.type === type)?.value ?? ''
  const hora = parseInt(get('hour'), 10)
  const minuto = parseInt(get('minute'), 10)

  return {
    data: `${get('year')}-${get('month')}-${get('day')}`,
    minutos: hora * 60 + minuto,
    horario: `${get('hour')}:${get('minute')}`,
  }
}

function minutosDoHorario(horarioConfig: string): number | null {
  // horarioConfig formato 'HH:MM:SS' ou 'HH:MM'
  const [hh, mm] = horarioConfig.split(':').map((n) => parseInt(n, 10))
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  return hh * 60 + mm
}

function horarioExato(horarioConfig: string, minutosAtuais: number): boolean {
  // O cron pg_cron dispara a cada minuto, então comparação exata de
  // hora:minuto basta — o motorista quer mensagens saindo na hora cravada
  // que configurou, sem janela de tolerância.
  const alvo = minutosDoHorario(horarioConfig)
  if (alvo === null) return false
  return minutosAtuais === alvo
}

interface ResultadoReenvio {
  /** True quando todos os passageiros já responderam — nada a fazer */
  sem_pendentes: boolean
  enviadas: number
  falhas: number
  /** Detalhe por passageiro que falhou — vira `erros[]` no caller */
  falhas_detalhe: { passageiro_id: string; erro: string }[]
}

async function garantirConfirmacoesPendentesDaRota(
  supabase: ReturnType<typeof criarClienteServico>,
  viagemId: string,
  rotaId: string,
): Promise<number> {
  const { data: passageirosAtivos, error: paxErr } = await supabase
    .from('passageiros')
    .select('id')
    .eq('rota_id', rotaId)
    .eq('status', 'ativo')

  if (paxErr) throw paxErr

  const idsAtivos = (passageirosAtivos ?? [])
    .map((p) => p.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (idsAtivos.length === 0) return 0

  const { data: existentes, error: confErr } = await supabase
    .from('confirmacoes')
    .select('passageiro_id')
    .eq('viagem_id', viagemId)
    .in('passageiro_id', idsAtivos)

  if (confErr) throw confErr

  const existentesSet = new Set(
    (existentes ?? [])
      .map((c) => c.passageiro_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  )

  const faltantes = idsAtivos.filter((id) => !existentesSet.has(id))
  if (faltantes.length === 0) return 0

  const { data: criadas, error: insertErr } = await supabase
    .from('confirmacoes')
    .upsert(
      faltantes.map((passageiroId) => ({
        viagem_id: viagemId,
        passageiro_id: passageiroId,
        status: 'pendente' as const,
      })),
      {
        onConflict: 'viagem_id,passageiro_id',
        ignoreDuplicates: true,
      },
    )
    .select('id')

  if (insertErr) throw insertErr
  return criadas?.length ?? 0
}

/**
 * Cenário 2 da automacao-diaria: já existe viagem do dia para esta rota.
 *
 * Envia a mensagem de confirmação SOMENTE para os passageiros cuja
 * confirmação ainda está com `status='pendente'`. Quem já respondeu
 * (confirmado/ausente) não recebe mensagem — evita spam e respeita a
 * resposta do responsável.
 *
 * Registra cada envio em `mensagens` com `tentativas` incrementado
 * (mesmo padrão do `reenviar-confirmacao`), e mensagens falhas com
 * `status_envio='falha'` para visibilidade.
 */
async function processarReenvioPendentes(
  supabase: ReturnType<typeof criarClienteServico>,
  viagemId: string,
  rotaId: string,
  motoristaId: string,
  rotaNome: string,
): Promise<ResultadoReenvio> {
  const confirmacoesCriadasAgora = await garantirConfirmacoesPendentesDaRota(
    supabase,
    viagemId,
    rotaId,
  )
  if (confirmacoesCriadasAgora > 0) {
    console.log(
      '[automacao-diaria/reenvio] confirmacoes_reconciliadas',
      JSON.stringify({
        viagem_id: viagemId,
        rota_id: rotaId,
        rota_nome: rotaNome,
        confirmacoes_criadas: confirmacoesCriadasAgora,
      }),
    )
  }

  // 1. Busca pendentes da viagem com os dados do passageiro
  const { data: pendentes, error: pendErr } = await supabase
    .from('confirmacoes')
    .select(
      'id, passageiros(id, nome_completo, telefone_responsavel)',
    )
    .eq('viagem_id', viagemId)
    .eq('status', 'pendente')

  if (pendErr) throw pendErr

  if (!pendentes || pendentes.length === 0) {
    return { sem_pendentes: true, enviadas: 0, falhas: 0, falhas_detalhe: [] }
  }

  // 2. Carrega template + opções ativas
  const { data: template, error: tplErr } = await supabase
    .from('templates_mensagem')
    .select('id, cabecalho, rodape')
    .eq('motorista_id', motoristaId)
    .eq('ativo', true)
    .maybeSingle()
  if (tplErr) throw tplErr
  if (!template) throw new Error('Motorista sem template ativo')

  const { data: opcoes, error: opErr } = await supabase
    .from('opcoes_resposta')
    .select('numero, texto_exibido')
    .eq('template_id', template.id)
    .eq('ativo', true)
    .order('numero', { ascending: true })
  if (opErr) throw opErr
  const opcoesAtivas = (opcoes ?? []) as { numero: number; texto_exibido: string }[]
  if (opcoesAtivas.length === 0) throw new Error('Template sem opções ativas')

  // 3. Instância para registrar nas mensagens
  const { data: instancia } = await supabase
    .from('instancias_whatsapp')
    .select('id')
    .eq('motorista_id', motoristaId)
    .maybeSingle()
  const instanciaId = instancia?.id ?? null

  // 4. Variáveis de contexto (mesmo cálculo do envio inicial)
  const saudacao = obterSaudacaoBrasil()
  const dataFmt = formatarDataBR()

  let enviadas = 0
  let falhas = 0
  const falhas_detalhe: { passageiro_id: string; erro: string }[] = []

  // 5. Loop nos pendentes
  for (const conf of pendentes) {
    const pax = (conf as any).passageiros
    if (!pax?.id || !pax?.telefone_responsavel) {
      falhas++
      falhas_detalhe.push({
        passageiro_id: pax?.id ?? '-',
        erro: 'Passageiro sem telefone do responsável',
      })
      continue
    }

    const cabecalho = aplicarVariaveis(
      template.cabecalho,
      pax.nome_completo,
      dataFmt,
      saudacao,
    )
    const rodape = aplicarVariaveis(
      template.rodape,
      pax.nome_completo,
      dataFmt,
      saudacao,
    )

    const corpoLegivel = [
      cabecalho,
      '',
      'Responda com o número da opção desejada:',
      ...opcoesAtivas.map((o) => `${o.numero} - ${o.texto_exibido}`),
      '',
      rodape,
    ].join('\n')

    // Conta tentativas anteriores para essa confirmação — mesma sequência
    // que o `reenviar-confirmacao` usa, mantém log unificado.
    const { count: tentativasAnteriores } = await supabase
      .from('mensagens')
      .select('id', { count: 'exact', head: true })
      .eq('confirmacao_id', conf.id)
      .eq('tipo', 'confirmacao_diaria')
      .eq('direcao', 'saida')
    const tentativaAtual = (tentativasAnteriores ?? 0) + 1

    let envioOk = false
    let envioErro: string | null = null
    let whatsappMsgId: string | null = null

    try {
      const resp = await evolutionEnviarTexto(
        pax.telefone_responsavel,
        corpoLegivel,
      )
      whatsappMsgId = resp.key?.id ?? null
      envioOk = true
      console.log(
        '[automacao-diaria/reenvio] sendText OK',
        JSON.stringify({
          passageiro: pax.nome_completo,
          telefone: pax.telefone_responsavel,
          rota: rotaNome,
          confirmacao_id: conf.id,
          tentativa: tentativaAtual,
        }),
      )
    } catch (e) {
      envioErro = e instanceof Error ? e.message : String(e)
      console.error(
        '[automacao-diaria/reenvio] sendText FALHOU',
        JSON.stringify({
          passageiro: pax.nome_completo,
          telefone: pax.telefone_responsavel,
          rota: rotaNome,
          confirmacao_id: conf.id,
          tentativa: tentativaAtual,
          erro: envioErro,
        }),
      )
    }

    await supabase.from('mensagens').insert({
      instancia_whatsapp_id: instanciaId,
      passageiro_id: pax.id,
      confirmacao_id: conf.id,
      conteudo: corpoLegivel,
      direcao: 'saida',
      tipo: 'confirmacao_diaria',
      status_envio: envioOk ? 'enviada' : 'falha',
      whatsapp_message_id: whatsappMsgId,
      tentativas: tentativaAtual,
    })

    if (envioOk) {
      enviadas++
    } else {
      falhas++
      falhas_detalhe.push({
        passageiro_id: pax.id,
        erro: envioErro ?? 'falha desconhecida',
      })
    }
  }

  return { sem_pendentes: false, enviadas, falhas, falhas_detalhe }
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    const expected = Deno.env.get('CRON_SECRET') ?? ''
    const received = req.headers.get('x-cron-secret') ?? ''
    if (!expected || expected !== received) {
      return erroCliente('Cron secret inválido', 'CRON_INVALIDO', 401)
    }

    // Body opcional:
    //   { ignorar_horario?: boolean, motorista_id?: string }
    //
    // - motorista_id: restringe o disparo a UM motorista. Sem ele, processa
    //   todos os motoristas com envio_automatico_ativo=true (uso normal do
    //   cron multi-tenant — a janela de horário individual decide quem entra).
    //
    // - ignorar_horario=true: pula a checagem ±5min — útil pra testes
    //   manuais. SALVAGUARDA: para evitar disparo em massa indesejado, exige
    //   motorista_id quando ignorar_horario=true.
    let ignorarHorario = false
    let motoristaIdFilter: string | null = null
    try {
      const body = await req.json()
      ignorarHorario = body?.ignorar_horario === true
      if (typeof body?.motorista_id === 'string' && body.motorista_id.trim()) {
        motoristaIdFilter = body.motorista_id.trim()
      }
    } catch {
      // body opcional
    }

    if (ignorarHorario && !motoristaIdFilter) {
      return erroCliente(
        'Quando ignorar_horario=true, motorista_id é obrigatório para evitar disparo em massa.',
        'MOTORISTA_ID_OBRIGATORIO',
        400,
      )
    }

    const supabase = criarClienteServico()
    const agoraBrasil = obterAgoraBrasil()
    const hoje = agoraBrasil.data

    // Busca configurações com envio automático ativo
    const { data: configs, error: cfgErr } = await supabase
      .from('configuracoes_automacao')
      .select(
        'id, horario_envio_automatico, route_mode, route_id, instancia_whatsapp_id, instancias_whatsapp(motorista_id)',
      )
      .eq('envio_automatico_ativo', true)

    if (cfgErr) throw cfgErr

    // Aplica filtro de motorista (se passado). Como o motorista_id está em
    // join com instancias_whatsapp, filtramos em memória — economiza um round-trip
    // que custaria mais que filtrar a lista pequena de motoristas.
    const configsParaProcessar = motoristaIdFilter
      ? (configs ?? []).filter(
          (c: any) =>
            (c as any).instancias_whatsapp?.motorista_id === motoristaIdFilter,
        )
      : (configs ?? [])

    const detalhes: Detalhe[] = []
    let processados = 0
    let comErro = 0

    for (const cfg of configsParaProcessar) {
      const motoristaId: string | undefined = (cfg as any).instancias_whatsapp
        ?.motorista_id
      const horario: string | null = cfg.horario_envio_automatico
      const routeMode: 'all' | 'specific' =
        cfg.route_mode === 'specific' ? 'specific' : 'all'
      const routeId: string | null =
        typeof cfg.route_id === 'string' && cfg.route_id.trim()
          ? cfg.route_id.trim()
          : null
      if (!motoristaId) continue

      const { data: agendamentosRotas, error: agendamentosErr } = await supabase
        .from('configuracoes_automacao_rotas')
        .select('rota_id, horario_envio, envio_automatico_ativo')
        .eq('instancia_whatsapp_id', cfg.instancia_whatsapp_id)

      if (agendamentosErr && !['42P01', 'PGRST205'].includes(agendamentosErr.code ?? '')) {
        throw agendamentosErr
      }

      const agendamentosConfigurados = (agendamentosRotas ?? []) as {
        rota_id: string
        horario_envio: string
        envio_automatico_ativo: boolean
      }[]
      const agendamentosAtivos = agendamentosConfigurados.filter((a) => a.envio_automatico_ativo)
      const usaAgendamentoPorRota = agendamentosConfigurados.length > 0
      const agendamentosNoHorario = ignorarHorario
        ? agendamentosAtivos
        : agendamentosAtivos.filter((agendamento) =>
            horarioExato(agendamento.horario_envio, agoraBrasil.minutos)
          )

      // Busca rotas ativas do motorista (precisamos do nome também para os logs
      // de cenário e do reenvio).
      let rotasQuery = supabase
        .from('rotas')
        .select('id, nome')
        .eq('motorista_id', motoristaId)
        .eq('status', 'ativa')

      if (usaAgendamentoPorRota) {
        if (agendamentosNoHorario.length === 0) {
          console.log(
            '[automacao-diaria] cenario=fora_da_janela_por_rota',
            JSON.stringify({
              motorista_id: motoristaId,
              horario_atual_minutos: agoraBrasil.minutos,
              agendamentos: agendamentosAtivos.map((a) => ({
                rota_id: a.rota_id,
                horario_envio: a.horario_envio,
              })),
            }),
          )
          continue
        }
        rotasQuery = rotasQuery.in(
          'id',
          agendamentosNoHorario.map((a) => a.rota_id),
        )
      } else if (routeMode === 'specific') {
        if (!routeId) {
          comErro++
          detalhes.push({
            motorista_id: motoristaId,
            rotas_iniciadas: 0,
            pendentes_reenviados: 0,
            rotas_sem_pendentes: 0,
            erros: [{ rota_id: '-', erro: 'Configuracao de envio automatico sem rota selecionada.' }],
          })
          continue
        }
        rotasQuery = rotasQuery.eq('id', routeId)
      }

      const { data: rotas, error: rotasErr } = await rotasQuery

      if (rotasErr) {
        comErro++
        detalhes.push({
          motorista_id: motoristaId,
          rotas_iniciadas: 0,
          pendentes_reenviados: 0,
          rotas_sem_pendentes: 0,
          erros: [{ rota_id: '-', erro: rotasErr.message }],
        })
        continue
      }

      if (!usaAgendamentoPorRota && routeMode === 'specific' && (!rotas || rotas.length === 0)) {
        comErro++
        detalhes.push({
          motorista_id: motoristaId,
          rotas_iniciadas: 0,
          pendentes_reenviados: 0,
          rotas_sem_pendentes: 0,
          erros: [{ rota_id: routeId ?? '-', erro: 'Rota configurada para envio automatico nao existe ou esta inativa.' }],
        })
        continue
      }

      let rotasIniciadas = 0
      let pendentesReenviados = 0
      let rotasSemPendentes = 0
      const erros: { rota_id: string; erro: string }[] = []
      if (!usaAgendamentoPorRota && (!horario || (!ignorarHorario && !horarioExato(horario, agoraBrasil.minutos)))) {
        console.log(
          '[automacao-diaria] cenario=fora_da_janela',
          JSON.stringify({
            motorista_id: motoristaId,
            horario_configurado: horario,
            horario_atual_minutos: agoraBrasil.minutos,
          }),
        )
        if (erros.length > 0) {
          detalhes.push({
            motorista_id: motoristaId,
            rotas_iniciadas: 0,
            pendentes_reenviados: 0,
            rotas_sem_pendentes: 0,
            erros,
          })
        }
        if (erros.length > 0) comErro++
        continue
      }

      for (const rota of rotas ?? []) {
        // Verifica se já existe viagem para hoje — isso decide o cenário
        const { data: viagemExistente } = await supabase
          .from('viagens')
          .select('id')
          .eq('rota_id', rota.id)
          .eq('data', hoje)
          .maybeSingle()

        try {
          if (!viagemExistente) {
            // ---- CENÁRIO 1: rota nova hoje ----
            // Cria viagem + confirmações pendentes + envia para todos
            console.log(
              '[automacao-diaria] cenario=rota_iniciada',
              JSON.stringify({
                motorista_id: motoristaId,
                rota_id: rota.id,
                rota_nome: rota.nome,
              }),
            )
            await processarIniciarViagem(supabase, motoristaId, rota.id, {
              dataViagem: hoje,
              enviarMensagens: true,
            })
            rotasIniciadas++
          } else {
            // ---- CENÁRIO 2: viagem já existe ----
            // Reenvio só para confirmacoes ainda pendentes
            const r = await processarReenvioPendentes(
              supabase,
              viagemExistente.id,
              rota.id,
              motoristaId,
              rota.nome,
            )
            if (r.sem_pendentes) {
              console.log(
                '[automacao-diaria] cenario=sem_pendentes',
                JSON.stringify({
                  motorista_id: motoristaId,
                  rota_id: rota.id,
                  rota_nome: rota.nome,
                  viagem_id: viagemExistente.id,
                }),
              )
              rotasSemPendentes++
            } else {
              console.log(
                '[automacao-diaria] cenario=reenvio_pendentes',
                JSON.stringify({
                  motorista_id: motoristaId,
                  rota_id: rota.id,
                  rota_nome: rota.nome,
                  viagem_id: viagemExistente.id,
                  enviadas: r.enviadas,
                  falhas: r.falhas,
                }),
              )
              pendentesReenviados += r.enviadas
              // Falhas de reenvio entram em erros (visibilidade no contador
              // com_erro e no array de detalhes da resposta)
              for (const f of r.falhas_detalhe) {
                erros.push({
                  rota_id: rota.id,
                  erro: `reenvio falhou para passageiro ${f.passageiro_id}: ${f.erro}`,
                })
              }
            }
          }
        } catch (e) {
          erros.push({
            rota_id: rota.id,
            erro: e instanceof Error ? e.message : String(e),
          })
        }
      }

      detalhes.push({
        motorista_id: motoristaId,
        rotas_iniciadas: rotasIniciadas,
        pendentes_reenviados: pendentesReenviados,
        rotas_sem_pendentes: rotasSemPendentes,
        erros,
      })
      if (erros.length > 0) comErro++
      else processados++
    }

    return ok({
      processados,
      com_erro: comErro,
      timezone: TIME_ZONE_BR,
      horario_atual_local: agoraBrasil.horario,
      data_local: hoje,
      detalhes,
    })
  } catch (err) {
    return erroServidor(err)
  }
})
