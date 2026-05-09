// deno-lint-ignore-file no-explicit-any

const EVOLUTION_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME') ?? ''

export interface EvolutionResposta {
  key: { id: string; remoteJid?: string; fromMe?: boolean }
  status?: string
  [k: string]: unknown
}

export interface OpcaoLista {
  rowId: string
  title: string
  description?: string
}

function assertConfig() {
  if (!EVOLUTION_URL || !EVOLUTION_KEY || !EVOLUTION_INSTANCE) {
    throw new Error(
      'Variáveis EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME são obrigatórias.',
    )
  }
}

async function chamar(
  endpoint: string,
  method: 'GET' | 'POST',
  body?: object,
): Promise<any> {
  assertConfig()
  const url = `${EVOLUTION_URL}${endpoint}`
  const ctrl = new AbortController()
  const timeoutId = setTimeout(() => ctrl.abort(), 30_000)
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const text = await response.text()
    const json = text ? JSON.parse(text) : {}
    if (!response.ok) {
      throw new Error(`Evolution API [${response.status}] ${endpoint}: ${text}`)
    }
    return json
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function evolutionVerificarConexao(): Promise<boolean> {
  const data = await chamar(
    `/instance/connectionState/${EVOLUTION_INSTANCE}`,
    'GET',
  )
  return data?.instance?.state === 'open'
}

export async function evolutionEnviarTexto(
  telefone: string,
  mensagem: string,
): Promise<EvolutionResposta> {
  return await chamar(`/message/sendText/${EVOLUTION_INSTANCE}`, 'POST', {
    number: telefone,
    text: mensagem,
  })
}

export async function evolutionEnviarLista(
  telefone: string,
  titulo: string,
  descricao: string,
  rodape: string,
  rows: OpcaoLista[],
): Promise<EvolutionResposta> {
  return await chamar(`/message/sendList/${EVOLUTION_INSTANCE}`, 'POST', {
    number: telefone,
    title: titulo,
    description: descricao,
    buttonText: 'Responder',
    footerText: rodape,
    values: [
      {
        title: 'Opções',
        rows,
      },
    ],
  })
}

export async function evolutionConfigurarWebhook(
  webhookUrl: string,
  webhookSecret: string,
): Promise<void> {
  await chamar(`/webhook/set/${EVOLUTION_INSTANCE}`, 'POST', {
    url: webhookUrl,
    webhook_by_events: true,
    webhook_base64: false,
    events: ['MESSAGES_UPSERT'],
    headers: {
      'x-webhook-secret': webhookSecret,
    },
  })
}
