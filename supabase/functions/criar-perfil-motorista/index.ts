import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { criarClienteUsuario } from '../_shared/auth.ts'

interface BodyInput {
  nome?: string
  telefone?: string
  cnh?: string
  placa_van?: string
  marca_van?: string
  modelo_van?: string
  ano_van?: number | string | null
}

async function garantirRotasPadrao(supabase: ReturnType<typeof criarClienteUsuario>, motoristaId: string) {
  const { data: rotasExistentes, error: lookupRotasErr } = await supabase
    .from('rotas')
    .select('id')
    .eq('motorista_id', motoristaId)
    .limit(1)

  if (lookupRotasErr) {
    return { rotasCriadas: 0, rotasErro: lookupRotasErr.message }
  }

  if (rotasExistentes && rotasExistentes.length > 0) {
    return { rotasCriadas: 0, rotasErro: null }
  }

  const padroes = [
    { motorista_id: motoristaId, nome: 'Rota Manhã', horario_saida: '07:00', turno: 'morning', status: 'ativa' },
    { motorista_id: motoristaId, nome: 'Rota Tarde', horario_saida: '12:00', turno: 'afternoon', status: 'ativa' },
    { motorista_id: motoristaId, nome: 'Rota Noite', horario_saida: '17:30', turno: 'night', status: 'ativa' },
  ]

  const { data: inseridas, error: rotasErr } = await supabase
    .from('rotas')
    .insert(padroes)
    .select('id')

  if (rotasErr) {
    console.error('[criar-perfil-motorista] falha ao criar rotas padrão:', rotasErr)
    return { rotasCriadas: 0, rotasErro: rotasErr.message }
  }

  return { rotasCriadas: inseridas?.length ?? 0, rotasErro: null }
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

    const cnh = body.cnh?.trim() || null
    if (false && !cnh) {
      return erroCliente(
        'CNH Ã© obrigatÃ³ria para concluir o cadastro do motorista',
        'CNH_OBRIGATORIA',
        400,
      )
    }

    const placaVan = body.placa_van?.trim() || null
    const marcaVan = body.marca_van?.trim() || null
    const modeloVan = body.modelo_van?.trim() || null
    const anoVan =
      body.ano_van === null || body.ano_van === undefined || body.ano_van === ''
        ? null
        : Number.parseInt(String(body.ano_van), 10)

    if (
      body.ano_van !== null &&
      body.ano_van !== undefined &&
      body.ano_van !== '' &&
      Number.isNaN(anoVan)
    ) {
      return erroCliente(
        'Ano do veÃ­culo invÃ¡lido',
        'ANO_VEICULO_INVALIDO',
        400,
      )
    }

    if (!placaVan) {
      return erroCliente('Placa do veiculo e obrigatoria', 'PLACA_OBRIGATORIA', 400)
    }
    if (!marcaVan) {
      return erroCliente('Marca do veiculo e obrigatoria', 'MARCA_OBRIGATORIA', 400)
    }
    if (!modeloVan) {
      return erroCliente('Modelo do veiculo e obrigatorio', 'MODELO_OBRIGATORIO', 400)
    }
    if (anoVan === null) {
      return erroCliente('Ano do veiculo e obrigatorio', 'ANO_OBRIGATORIO', 400)
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
      const { rotasCriadas, rotasErro } = await garantirRotasPadrao(supabase, existente.id)
      return ok({
        motorista: existente,
        criado: false,
        rotas_criadas: rotasCriadas,
        ...(rotasErro ? { aviso: 'criação de rotas padrão falhou: ' + rotasErro } : {}),
      })
    }

    const { data: novoMotorista, error: insertErr } = await supabase
      .from('motoristas')
      .insert({
        user_id: user.id,
        nome,
        email,
        telefone: body.telefone ?? null,
        cnh,
        placa_van: placaVan,
        marca_van: marcaVan,
        modelo_van: modeloVan,
        ano_van: anoVan,
      })
      .select('*')
      .single()
    if (insertErr) throw insertErr

    // Cria dados iniciais (instância WA, configuração, template, opções)
    const { error: rpcErr } = await supabase.rpc(
      'criar_dados_iniciais_motorista',
      { p_motorista_id: novoMotorista.id },
    )

    // Cria as 3 rotas padrão (Manhã / Tarde / Noite) no MESMO request com o
    // JWT já validado. Garante atomicidade e elimina race conditions de RLS
    // no client logo após signUp. Idempotente: se já existem (raro), pula.
    const { rotasCriadas, rotasErro } = await garantirRotasPadrao(supabase, novoMotorista.id)

    const avisos: string[] = []
    if (rpcErr) avisos.push('criar_dados_iniciais_motorista falhou: ' + rpcErr.message)
    if (rotasErro) avisos.push('criação de rotas padrão falhou: ' + rotasErro)

    return ok(
      {
        motorista: novoMotorista,
        criado: true,
        rotas_criadas: rotasCriadas,
        ...(avisos.length > 0 ? { aviso: avisos.join(' | ') } : {}),
      },
      201,
    )
  } catch (err) {
    return erroServidor(err)
  }
})
