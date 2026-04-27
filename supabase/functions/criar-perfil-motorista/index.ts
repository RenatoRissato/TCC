import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { criarClienteUsuario } from '../_shared/auth.ts'

interface BodyInput {
  nome?: string
  telefone?: string
  cnh?: string
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    const supabase = criarClienteUsuario(req)
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return erroCliente('JWT inválido', 'NAO_AUTORIZADO', 401)
    }
    const user = userData.user

    let body: BodyInput
    try {
      body = (await req.json()) as BodyInput
    } catch {
      return erroCliente('Body JSON inválido', 'BODY_INVALIDO', 400)
    }

    const nome = body.nome?.trim()
    if (!nome || nome.length < 3) {
      return erroCliente(
        'Nome é obrigatório e deve ter ao menos 3 caracteres',
        'NOME_INVALIDO',
        400,
      )
    }

    const email = user.email
    if (!email) {
      return erroCliente(
        'Conta sem email associado',
        'EMAIL_AUSENTE',
        400,
      )
    }

    // Já existe?
    const { data: existente, error: lookupErr } = await supabase
      .from('motoristas')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (lookupErr) throw lookupErr

    if (existente) {
      return ok({ motorista: existente, criado: false })
    }

    const { data: novoMotorista, error: insertErr } = await supabase
      .from('motoristas')
      .insert({
        user_id: user.id,
        nome,
        email,
        telefone: body.telefone ?? null,
        cnh: body.cnh ?? null,
      })
      .select('*')
      .single()
    if (insertErr) throw insertErr

    // Cria dados iniciais (instância WA, configuração, template, opções)
    const { error: rpcErr } = await supabase.rpc(
      'criar_dados_iniciais_motorista',
      { p_motorista_id: novoMotorista.id },
    )
    if (rpcErr) {
      // motorista já criado — reportamos mas não falhamos completamente
      return ok(
        {
          motorista: novoMotorista,
          criado: true,
          aviso:
            'Perfil criado, porém criar_dados_iniciais_motorista falhou: ' +
            rpcErr.message,
        },
        201,
      )
    }

    return ok({ motorista: novoMotorista, criado: true }, 201)
  } catch (err) {
    return erroServidor(err)
  }
})
