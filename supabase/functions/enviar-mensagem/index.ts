// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { AuthError, getMotorista } from '../_shared/auth.ts'
import {
  evolutionEnviarTexto,
  evolutionVerificarConexao,
} from '../_shared/evolution.ts'

interface Body {
  passageiro_id?: string
  mensagem?: string
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    const { motorista, supabase } = await getMotorista(req)

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return erroCliente('Body JSON inválido', 'BODY_INVALIDO', 400)
    }

    const passageiroId = body.passageiro_id?.trim()
    const mensagem = body.mensagem?.trim()
    if (!passageiroId || !mensagem) {
      return erroCliente(
        'passageiro_id e mensagem são obrigatórios',
        'CAMPOS_OBRIGATORIOS',
        400,
      )
    }

    // Verifica que o passageiro pertence a uma rota do motorista
    const { data: passageiro, error: paxErr } = await supabase
      .from('passageiros')
      .select(
        'id, nome_completo, telefone_responsavel, rotas!inner(motorista_id)',
      )
      .eq('id', passageiroId)
      .maybeSingle()

    if (paxErr) throw paxErr
    if (
      !passageiro ||
      (passageiro as any).rotas?.motorista_id !== motorista.id
    ) {
      return erroCliente(
        'Passageiro não encontrado ou não pertence ao motorista',
        'PASSAGEIRO_NAO_ENCONTRADO',
        403,
      )
    }

    // Verifica conexão WhatsApp
    let conectado = false
    try {
      conectado = await evolutionVerificarConexao()
    } catch (e) {
      return erroCliente(
        'Nao foi possivel consultar a Evolution API. Verifique os secrets e o servidor WhatsApp.',
        'EVOLUTION_INDISPONIVEL',
        503,
        { detalhes: e instanceof Error ? e.message : String(e) },
      )
    }
    if (!conectado) {
      return erroCliente(
        'WhatsApp não está conectado. Reconecte para enviar mensagens.',
        'WHATSAPP_DESCONECTADO',
        503,
      )
    }

    // Busca instancia para registrar
    const { data: instancia } = await supabase
      .from('instancias_whatsapp')
      .select('id')
      .eq('motorista_id', motorista.id)
      .maybeSingle()

    let resp
    try {
      resp = await evolutionEnviarTexto(passageiro.telefone_responsavel, mensagem)
    } catch (e) {
      await supabase.from('mensagens').insert({
        instancia_whatsapp_id: instancia?.id ?? null,
        passageiro_id: passageiro.id,
        confirmacao_id: null,
        conteudo: mensagem,
        direcao: 'saida',
        tipo: 'avulsa',
        status_envio: 'falha',
        tentativas: 1,
      })
      return erroServidor(e)
    }

    await supabase.from('mensagens').insert({
      instancia_whatsapp_id: instancia?.id ?? null,
      passageiro_id: passageiro.id,
      confirmacao_id: null,
      conteudo: mensagem,
      direcao: 'saida',
      tipo: 'avulsa',
      status_envio: 'enviada',
      whatsapp_message_id: resp.key?.id ?? null,
      tentativas: 1,
    })

    return ok({
      sucesso: true,
      passageiro: passageiro.nome_completo,
      telefone: passageiro.telefone_responsavel,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
