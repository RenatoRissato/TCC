// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { criarClienteServico } from '../_shared/auth.ts'
import { processarIniciarViagem } from '../_shared/viagem.ts'

interface Detalhe {
  motorista_id: string
  rotas_iniciadas: number
  erros: { rota_id: string; erro: string }[]
}

function dentroDaJanela(horarioConfig: string, agora: Date, toleranciaMin = 5): boolean {
  // horarioConfig formato 'HH:MM:SS' ou 'HH:MM'
  const [hh, mm] = horarioConfig.split(':').map((n) => parseInt(n, 10))
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false
  const alvo = hh * 60 + mm
  const atual = agora.getUTCHours() * 60 + agora.getUTCMinutes()
  return Math.abs(atual - alvo) <= toleranciaMin
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
    const agora = new Date()
    const hoje = agora.toISOString().slice(0, 10)

    // Busca configurações com envio automático ativo
    const { data: configs, error: cfgErr } = await supabase
      .from('configuracoes_automacao')
      .select(
        'id, horario_envio_automatico, instancia_whatsapp_id, instancias_whatsapp(motorista_id)',
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
      if (!motoristaId || !horario) continue

      if (!ignorarHorario && !dentroDaJanela(horario, agora)) continue

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
          erros: [{ rota_id: '-', erro: rotasErr.message }],
        })
        continue
      }

      let rotasIniciadas = 0
      const erros: { rota_id: string; erro: string }[] = []

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
          await processarIniciarViagem(supabase, motoristaId, rota.id)
          rotasIniciadas++
        } catch (e) {
          erros.push({
            rota_id: rota.id,
            erro: e instanceof Error ? e.message : String(e),
          })
        }
      }

      detalhes.push({ motorista_id: motoristaId, rotas_iniciadas: rotasIniciadas, erros })
      if (erros.length > 0) comErro++
      else processados++
    }

    return ok({ processados, com_erro: comErro, detalhes })
  } catch (err) {
    return erroServidor(err)
  }
})
