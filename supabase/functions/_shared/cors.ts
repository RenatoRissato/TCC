const appOrigin = Deno.env.get('APP_ORIGIN')?.trim() || '*'

export const corsHeaders = {
  // Em producao, configure APP_ORIGIN com a URL do frontend para evitar
  // chamadas browser vindas de origens desconhecidas. Sem a env, mantem "*"
  // para nao quebrar desenvolvimento local e testes do TCC.
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
