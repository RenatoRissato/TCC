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
  let detalhes: string
  if (err instanceof Error) {
    detalhes = err.message
  } else if (err && typeof err === 'object') {
    try {
      detalhes = JSON.stringify(err)
    } catch {
      detalhes = String(err)
    }
  } else {
    detalhes = String(err)
  }

  return new Response(
    JSON.stringify({ erro: 'Erro interno do servidor', detalhes }),
    { status: 500, headers: jsonHeaders },
  )
}
