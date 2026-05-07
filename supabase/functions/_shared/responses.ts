import { corsHeaders } from './cors.ts'

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

export function ok(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

export function erroCliente(
  mensagem: string,
  codigo: string,
  status: 400 | 401 | 403 | 404 | 409 | 503 = 400,
  extras: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({ erro: mensagem, codigo, ...extras }),
    { status, headers: jsonHeaders },
  )
}

export function erroServidor(err: unknown): Response {
  const detalhes = err instanceof Error ? err.message : String(err)
  return new Response(
    JSON.stringify({ erro: 'Erro interno do servidor', detalhes }),
    { status: 500, headers: jsonHeaders },
  )
}
