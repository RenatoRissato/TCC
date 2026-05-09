// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { criarClienteServico } from '../_shared/auth.ts'
import { processarIniciarViagem } from '../_shared/viagem.ts'

interface Detalhe {
  motorista_id: string
  rotas_iniciadas: number
  pendentes_marcados_ausentes: number
  erros: { rota_id: string; erro: string }[]
}

const TIME_ZONE_BR = 'America/Sao_Paulo'

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

function dentroDaJanela(horarioConfig: string, minutosAtuais: number, toleranciaMin = 5): boolean {
  const alvo = minutosDoHorario(horarioConfig)
  if (alvo === null) return false
  return Math.abs(minutosAtuais - alvo) <= toleranciaMin
}

function passouDoLimite(horarioLimite: string | null, minutosAtuais: number): boolean {
  if (!horarioLimite) return false
  const alvo = minutosDoHorario(horarioLimite)
  if (alvo === null) return false
  return minutosAtuais >= alvo
}

async function marcarPendentesAposLimite(
  supabase: ReturnType<typeof criarClienteServico>,
  rotaIds: string[],
  dataHoje: string,
): Promise<number> {
  if (rotaIds.length === 0) return 0

  const { data: viagens, error: viagemErr } = await supabase
    .from('viagens')
    .select('id')
    .in('rota_id', rotaIds)
    .eq('data', dataHoje)

  if (viagemErr) throw viagemErr
  const viagemIds = (viagens ?? []).map((v) => v.id)
  if (viagemIds.length === 0) return 0

  const { data: atualizadas, error: updErr } = await supabase
    .from('confirmacoes')
    .update({ status: 'ausente' })
    .in('viagem_id', viagemIds)
    .eq('status', 'pendente')
    .select('id')

  if (updErr) throw updErr
  return atualizadas?.length ?? 0
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

    // Permite ignorar a checagem de janela via body { ignorar_horario: true }
    let ignorarHorario = false
    try {
      const body = await req.json()
      ignorarHorario = body?.ignorar_horario === true
    } catch {
      // body opcional
    }

    const supabase = criarClienteServico()
    const agoraBrasil = obterAgoraBrasil()
    const hoje = agoraBrasil.data

    // Busca configurações com envio automático ativo
    const { data: configs, error: cfgErr } = await supabase
      .from('configuracoes_automacao')
      .select(
        'id, horario_envio_automatico, horario_limite_resposta, instancia_whatsapp_id, instancias_whatsapp(motorista_id)',
      )
      .eq('envio_automatico_ativo', true)

    if (cfgErr) throw cfgErr

    const detalhes: Detalhe[] = []
    let processados = 0
    let comErro = 0

    for (const cfg of configs ?? []) {
      const motoristaId: string | undefined = (cfg as any).instancias_whatsapp
        ?.motorista_id
      const horario: string | null = cfg.horario_envio_automatico
      const horarioLimite: string | null = cfg.horario_limite_resposta
      if (!motoristaId) continue

      // Busca rotas ativas do motorista
      const { data: rotas, error: rotasErr } = await supabase
        .from('rotas')
        .select('id')
        .eq('motorista_id', motoristaId)
        .eq('status', 'ativa')

      if (rotasErr) {
        comErro++
        detalhes.push({
          motorista_id: motoristaId,
          rotas_iniciadas: 0,
          pendentes_marcados_ausentes: 0,
          erros: [{ rota_id: '-', erro: rotasErr.message }],
        })
        continue
      }

      let rotasIniciadas = 0
      const erros: { rota_id: string; erro: string }[] = []
      const rotaIds = (rotas ?? []).map((r) => r.id)
      let pendentesMarcadosAusentes = 0

      if (passouDoLimite(horarioLimite, agoraBrasil.minutos)) {
        try {
          pendentesMarcadosAusentes = await marcarPendentesAposLimite(
            supabase,
            rotaIds,
            hoje,
          )
        } catch (e) {
          erros.push({
            rota_id: '-',
            erro: e instanceof Error ? e.message : String(e),
          })
        }
      }

      if (!horario || (!ignorarHorario && !dentroDaJanela(horario, agoraBrasil.minutos))) {
        if (pendentesMarcadosAusentes > 0 || erros.length > 0) {
          detalhes.push({
            motorista_id: motoristaId,
            rotas_iniciadas: 0,
            pendentes_marcados_ausentes: pendentesMarcadosAusentes,
            erros,
          })
        }
        if (erros.length > 0) comErro++
        continue
      }

      for (const rota of rotas ?? []) {
        // Pula se já houver viagem para hoje
        const { data: viagemExistente } = await supabase
          .from('viagens')
          .select('id')
          .eq('rota_id', rota.id)
          .eq('data', hoje)
          .maybeSingle()
        if (viagemExistente) continue

        try {
          await processarIniciarViagem(supabase, motoristaId, rota.id, {
            dataViagem: hoje,
          })
          rotasIniciadas++
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
        pendentes_marcados_ausentes: pendentesMarcadosAusentes,
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
