import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface Motorista {
  id: string
  user_id: string
  nome: string
  email: string
  telefone: string | null
  cnh: string | null
  criado_em: string
}

export interface ContextoMotorista {
  user: { id: string; email?: string }
  motorista: Motorista
  supabase: SupabaseClient
}

export class AuthError extends Error {
  codigo: 'NAO_AUTORIZADO' | 'MOTORISTA_NAO_ENCONTRADO'
  status: 401 | 404

  constructor(
    codigo: 'NAO_AUTORIZADO' | 'MOTORISTA_NAO_ENCONTRADO',
    mensagem: string,
  ) {
    super(mensagem)
    this.codigo = codigo
    this.status = codigo === 'NAO_AUTORIZADO' ? 401 : 404
  }
}

export function criarClienteUsuario(req: Request): SupabaseClient {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function criarClienteServico(): SupabaseClient {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function getMotorista(req: Request): Promise<ContextoMotorista> {
  const supabase = criarClienteUsuario(req)
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    throw new AuthError('NAO_AUTORIZADO', 'JWT inválido ou ausente')
  }
  const user = userData.user
  const { data: motorista, error: motErr } = await supabase
    .from('motoristas')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (motErr) {
    throw new Error(`Erro ao buscar motorista: ${motErr.message}`)
  }
  if (!motorista) {
    throw new AuthError(
      'MOTORISTA_NAO_ENCONTRADO',
      'Usuário autenticado não possui perfil de motorista',
    )
  }
  return { user: { id: user.id, email: user.email }, motorista, supabase }
}
