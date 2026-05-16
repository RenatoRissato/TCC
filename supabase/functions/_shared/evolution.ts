// deno-lint-ignore-file no-explicit-any
import QRCode from 'qrcode'

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
  method: 'GET' | 'POST' | 'DELETE',
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
  const state = normalizarState(
    data?.instance?.state,
    data?.instance?.connectionStatus,
    data?.state,
    data?.connectionStatus,
  )
  return state === 'open'
}

export interface EvolutionEstadoInstancia {
  state: 'open' | 'close' | 'connecting' | 'refused' | string | null
  numero: string | null
  nome: string | null
  raw: any
}

function normalizarState(...candidatos: unknown[]): string | null {
  for (const valor of candidatos) {
    if (typeof valor !== 'string') continue
    const normalizado = valor.trim().toLowerCase()
    if (!normalizado) continue
    if (normalizado === 'connected') return 'open'
    if (normalizado === 'disconnected') return 'close'
    return normalizado
  }
  return null
}

/**
 * Estado completo da instância — usado pelo polling de QR.
 * fetchInstances retorna array; filtramos pelo nome configurado.
 */
export async function evolutionFetchInstanceInfo(): Promise<EvolutionEstadoInstancia> {
  assertConfig()
  const data = await chamar(
    `/instance/fetchInstances?instanceName=${encodeURIComponent(EVOLUTION_INSTANCE)}`,
    'GET',
  )

  // Resposta varia por versão. Pode ser array, objeto com `instances`,
  // ou objeto único — normalizamos.
  const lista: any[] = Array.isArray(data)
    ? data
    : data?.instances ?? data?.value ?? [data]
  const item = lista.find((i: any) => {
    const nome = i?.instance?.instanceName ?? i?.instanceName ?? i?.name
    return nome === EVOLUTION_INSTANCE
  }) ?? lista[0] ?? null

  if (!item) return { state: null, numero: null, nome: null, raw: data }

  const inst = item.instance ?? item
  const state = normalizarState(
    inst.state,
    inst.connectionStatus,
    item.state,
    item.connectionStatus,
  )
  const owner: string | null =
    inst.owner ?? inst.ownerJid ?? item.owner ?? item.ownerJid ?? null
  const numero =
    (typeof inst.number === 'string' && inst.number) ||
    (typeof item.number === 'string' && item.number) ||
    (owner ? owner.split('@')[0] : null)
  const nome =
    inst.profileName ??
    inst.profile_name ??
    inst.pushName ??
    item.profileName ??
    item.profile_name ??
    item.pushName ??
    null

  return { state, numero, nome, raw: item }
}

export interface EvolutionQrCode {
  qr: string | null
  pairingCode: string | null
  raw: any
}

function normalizarDataUrlQr(valor: string | null | undefined): string | null {
  if (!valor) return null
  if (valor.startsWith('data:image/')) return valor
  return `data:image/png;base64,${valor}`
}

function extrairTextoQr(data: any): string | null {
  const candidatos = [
    data?.code,
    data?.qrcode?.code,
    typeof data?.qrcode === 'string' ? data.qrcode : null,
    data?.qrCode,
    data?.qr_code,
    data?.qr,
    data?.qrOrCode,
    data?.qrcode?.qrOrCode,
  ]

  for (const valor of candidatos) {
    if (typeof valor === 'string' && valor.trim()) return valor.trim()
  }
  return null
}

async function gerarImagemQrDeTexto(texto: string): Promise<string> {
  return await QRCode.toDataURL(texto, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  })
}

/**
 * Solicita um novo QR Code para parear a instância.
 * GET /instance/connect/{instance} — Evolution API v2
 */
export async function evolutionConectarInstancia(): Promise<EvolutionQrCode> {
  const data = await chamar(`/instance/connect/${EVOLUTION_INSTANCE}`, 'GET')
  const base64Candidate: string | undefined =
    data?.base64 ??
    data?.qrcode?.base64 ??
    data?.qrBase64 ??
    data?.qr_base64 ??
    data?.qrcode?.qrBase64 ??
    data?.qrcode?.qr_base64
  const textoQr = extrairTextoQr(data)
  const pairing: string | undefined =
    data?.pairingCode ??
    data?.pairing_code ??
    data?.qrcode?.pairingCode ??
    data?.qrcode?.pairing_code

  // Garante data-URL para o <img>. Algumas versões retornam só o base64.
  let qr = normalizarDataUrlQr(base64Candidate)
  if (!qr && textoQr) {
    qr = textoQr.startsWith('data:image/')
      ? textoQr
      : await gerarImagemQrDeTexto(textoQr)
  }
  return { qr, pairingCode: pairing ?? null, raw: data }
}

export async function evolutionDesconectarInstancia(): Promise<any> {
  return await chamar(`/instance/logout/${EVOLUTION_INSTANCE}`, 'DELETE')
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
  // Evolution v2 mudou o nome do campo: antes era `values`, agora é `sections`.
  // Confirmado via 400 Bad Request: "instance requires property sections".
  return await chamar(`/message/sendList/${EVOLUTION_INSTANCE}`, 'POST', {
    number: telefone,
    title: titulo,
    description: descricao,
    buttonText: 'Responder',
    footerText: rodape,
    sections: [
      {
        title: 'Opções',
        rows,
      },
    ],
  })
}

export const EVENTOS_WEBHOOK_PADRAO = [
  'MESSAGES_UPSERT',
  'MESSAGES_UPDATE',
  'QRCODE_UPDATED',
  'CONNECTION_UPDATE',
] as const

export async function evolutionConfigurarWebhook(
  webhookUrl: string,
  webhookSecret: string,
  eventos: readonly string[] = EVENTOS_WEBHOOK_PADRAO,
): Promise<any> {
  return await chamar(`/webhook/set/${EVOLUTION_INSTANCE}`, 'POST', {
    webhook: {
      enabled: true,
      url: webhookUrl,
      webhook_by_events: true,
      webhook_base64: false,
      events: eventos,
      headers: {
        'x-webhook-secret': webhookSecret,
      },
    },
  })
}
