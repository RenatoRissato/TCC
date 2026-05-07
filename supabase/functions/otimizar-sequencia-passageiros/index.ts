import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { AuthError, getMotorista } from '../_shared/auth.ts'

interface Body {
  rota_id?: string
  destino_index?: number
}

interface DestinoRota {
  rotulo?: string
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cep?: string | null
}

interface PassageiroAtivoDaRota {
  id: string
  nome_completo: string
  ordem_na_rota: number
  endereco: string
}

interface ComputeRoutesResponse {
  routes?: Array<{
    optimizedIntermediateWaypointIndex?: number[]
  }>
}

interface Coordenada {
  lat: number
  lon: number
}

interface NominatimSearchItem {
  lat: string
  lon: string
}

interface OsrmTripWaypoint {
  waypoint_index: number
}

interface OsrmTripResponse {
  code?: string
  waypoints?: OsrmTripWaypoint[]
}

function formatarEnderecoCompleto(end: {
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cep?: string | null
}): string {
  const rua = (end.rua ?? '').trim()
  const numero = (end.numero ?? '').trim()
  const bairro = (end.bairro ?? '').trim()
  const cep = (end.cep ?? '').trim()

  const ruaCompleta = numero ? `${rua}, ${numero}`.trim().replace(/^,\s*/, '') : rua
  const partes: string[] = []
  if (ruaCompleta) partes.push(ruaCompleta)
  if (bairro) partes.push(bairro)
  if (cep) partes.push(cep)
  return partes.join(', ')
}

function reordenarPassageirosPorIndices<T>(lista: T[], indices: number[]): T[] {
  if (lista.length !== indices.length) {
    throw new Error('A quantidade de índices otimizados não confere com a lista de passageiros.')
  }

  const vistos = new Set<number>()
  return indices.map((idx) => {
    if (!Number.isInteger(idx) || idx < 0 || idx >= lista.length) {
      throw new Error('A otimização retornou um índice de passageiro inválido.')
    }
    if (vistos.has(idx)) {
      throw new Error('A otimização retornou índices duplicados para os passageiros.')
    }
    vistos.add(idx)
    return lista[idx]
  })
}

function extrairIndicesOtimizadosDoOsrm(
  waypoints: Array<{ waypoint_index: number }>,
  totalPassageiros: number,
): number[] {
  if (waypoints.length !== totalPassageiros + 2) {
    throw new Error('A otimização OSRM retornou uma quantidade inesperada de waypoints.')
  }

  return waypoints
    .slice(1, totalPassageiros + 1)
    .map((waypoint, idxOriginal) => {
      if (!Number.isInteger(waypoint.waypoint_index)) {
        throw new Error('A otimização OSRM retornou waypoint_index inválido.')
      }
      return { idxOriginal, waypointIndex: waypoint.waypoint_index }
    })
    .sort((a, b) => a.waypointIndex - b.waypointIndex)
    .map((item) => item.idxOriginal)
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizarTextoEndereco(endereco: string): string {
  return endereco
    .replace(/\bRod\.\b/gi, 'Rodovia')
    .replace(/\bDep\.\b/gi, 'Deputado')
    .replace(/\bAv\.\b/gi, 'Avenida')
    .replace(/\bR\.\b/gi, 'Rua')
    .replace(/\s+/g, ' ')
    .trim()
}

function gerarConsultasEndereco(endereco: string): string[] {
  const normalizado = normalizarTextoEndereco(endereco)
  const partes = normalizado.split(',').map((p) => p.trim()).filter(Boolean)
  const [rua, numero, bairro, cep] = partes

  const candidatos = [
    normalizado,
    `${normalizado}, Brasil`,
    [rua, numero, bairro, cep].filter(Boolean).join(', '),
    [rua, numero, bairro].filter(Boolean).join(', '),
    [rua, numero, cep].filter(Boolean).join(', '),
    [rua, numero].filter(Boolean).join(', '),
    [bairro, cep].filter(Boolean).join(', '),
    cep ?? '',
    cep ? `${cep}, Brasil` : '',
  ]

  return [...new Set(candidatos.map((c) => c.trim()).filter(Boolean))]
}

async function buscarPassageirosAtivosDaRota(supabase: Awaited<ReturnType<typeof getMotorista>>['supabase'], rotaId: string) {
  const { data, error } = await supabase
    .from('passageiros')
    .select('id, nome_completo, embarque_rua, embarque_numero, embarque_bairro, embarque_cep, ordem_na_rota')
    .eq('rota_id', rotaId)
    .eq('status', 'ativo')
    .order('ordem_na_rota', { ascending: true })

  if (error) {
    throw new Error(`Não foi possível carregar os passageiros da rota: ${error.message}`)
  }

  return (data ?? [])
    .map((p: {
      id: string
      nome_completo: string
      embarque_rua: string | null
      embarque_numero: string | null
      embarque_bairro: string | null
      embarque_cep: string | null
      ordem_na_rota: number
    }): PassageiroAtivoDaRota => ({
      id: p.id,
      nome_completo: p.nome_completo,
      ordem_na_rota: p.ordem_na_rota,
      endereco: formatarEnderecoCompleto({
        rua: p.embarque_rua,
        numero: p.embarque_numero,
        bairro: p.embarque_bairro,
        cep: p.embarque_cep,
      }).trim(),
    }))
    .filter((p) => p.endereco.length > 0)
}

async function solicitarOrdemOtimizadaGoogle(params: {
  origem: string
  destinoFinal: string
  passageiros: PassageiroAtivoDaRota[]
}): Promise<number[]> {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim()
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY não configurada nas secrets do Supabase.')
  }

  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex',
    },
    body: JSON.stringify({
      origin: { address: params.origem },
      destination: { address: params.destinoFinal },
      intermediates: params.passageiros.map((p) => ({ address: p.endereco })),
      travelMode: 'DRIVE',
      optimizeWaypointOrder: true,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google Routes API respondeu ${response.status}: ${body}`)
  }

  const data = (await response.json()) as ComputeRoutesResponse
  const indices = data.routes?.[0]?.optimizedIntermediateWaypointIndex
  if (!indices || indices.length === 0) {
    throw new Error('A Google Routes API não retornou uma ordem otimizada de passageiros.')
  }

  return indices
}

async function geocodificarEnderecoOpenStreetMap(
  endereco: string,
  cache: Map<string, Coordenada>,
  controle: { ultimaConsultaEm: number },
): Promise<Coordenada> {
  const normalizado = endereco.trim()
  const cached = cache.get(normalizado)
  if (cached) return cached

  const intervaloMinimoMs = 1100
  const decorrido = Date.now() - controle.ultimaConsultaEm
  if (decorrido < intervaloMinimoMs) {
    await esperar(intervaloMinimoMs - decorrido)
  }

  let ultimoErro: Error | null = null
  for (const consulta of gerarConsultasEndereco(normalizado)) {
    const params = new URLSearchParams({
      q: consulta,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'br',
      addressdetails: '0',
    })

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SmartRoutes/1.0 (route-optimization)',
      },
    })
    controle.ultimaConsultaEm = Date.now()

    if (!response.ok) {
      const body = await response.text()
      ultimoErro = new Error(`Nominatim respondeu ${response.status}: ${body}`)
      continue
    }

    const data = (await response.json()) as NominatimSearchItem[]
    const match = data[0]
    if (!match) continue

    const lat = Number(match.lat)
    const lon = Number(match.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      ultimoErro = new Error(`O OpenStreetMap retornou coordenadas inválidas para "${consulta}".`)
      continue
    }

    const coordenada = { lat, lon }
    cache.set(normalizado, coordenada)
    return coordenada
  }

  if (ultimoErro) throw ultimoErro
  throw new Error(`Não foi possível localizar o endereço "${normalizado}" no OpenStreetMap.`)
}

async function solicitarOrdemOtimizadaOSRM(params: {
  origem: string
  destinoFinal: string
  passageiros: PassageiroAtivoDaRota[]
}): Promise<number[]> {
  const cache = new Map<string, Coordenada>()
  const controle = { ultimaConsultaEm: 0 }

  const coordenadas: Coordenada[] = []
  coordenadas.push(await geocodificarEnderecoOpenStreetMap(params.origem, cache, controle))
  for (const passageiro of params.passageiros) {
    coordenadas.push(await geocodificarEnderecoOpenStreetMap(passageiro.endereco, cache, controle))
  }
  coordenadas.push(await geocodificarEnderecoOpenStreetMap(params.destinoFinal, cache, controle))

  const coordenadasParam = coordenadas
    .map((coord) => `${coord.lon},${coord.lat}`)
    .join(';')

  const url = new URL(`https://router.project-osrm.org/trip/v1/driving/${coordenadasParam}`)
  url.searchParams.set('source', 'first')
  url.searchParams.set('destination', 'last')
  url.searchParams.set('roundtrip', 'false')
  url.searchParams.set('steps', 'false')
  url.searchParams.set('overview', 'false')

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OSRM respondeu ${response.status}: ${body}`)
  }

  const data = (await response.json()) as OsrmTripResponse
  if (data.code !== 'Ok' || !data.waypoints) {
    throw new Error(`OSRM não conseguiu otimizar a rota (${data.code ?? 'erro desconhecido'}).`)
  }

  return extrairIndicesOtimizadosDoOsrm(data.waypoints, params.passageiros.length)
}

async function solicitarOrdemOtimizada(params: {
  origem: string
  destinoFinal: string
  passageiros: PassageiroAtivoDaRota[]
}): Promise<{ indices: number[]; provedor: 'google' | 'osm' }> {
  const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim()
  if (googleKey) {
    try {
      const indices = await solicitarOrdemOtimizadaGoogle(params)
      return { indices, provedor: 'google' }
    } catch (error) {
      console.warn('Fallback para OpenStreetMap/OSRM após falha na Google Routes API:', error)
    }
  }

  const indices = await solicitarOrdemOtimizadaOSRM(params)
  return { indices, provedor: 'osm' }
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    const { supabase } = await getMotorista(req)

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return erroCliente('Body JSON inválido', 'BODY_INVALIDO', 400)
    }

    const rotaId = body.rota_id?.trim()
    if (!rotaId) {
      return erroCliente('rota_id é obrigatório', 'ROTA_OBRIGATORIA', 400)
    }

    const { data: rota, error: rotaErr } = await supabase
      .from('rotas')
      .select('id, ponto_saida_rua, ponto_saida_numero, ponto_saida_bairro, ponto_saida_cep, destinos')
      .eq('id', rotaId)
      .maybeSingle()

    if (rotaErr) {
      throw new Error(`Não foi possível carregar a rota: ${rotaErr.message}`)
    }
    if (!rota) {
      return erroCliente('Rota não encontrada.', 'ROTA_NAO_ENCONTRADA', 404)
    }

    const origem = formatarEnderecoCompleto({
      rua: rota.ponto_saida_rua,
      numero: rota.ponto_saida_numero,
      bairro: rota.ponto_saida_bairro,
      cep: rota.ponto_saida_cep,
    }).trim()

    const destinos = ((rota.destinos ?? []) as DestinoRota[])
      .map((d) => formatarEnderecoCompleto({
        rua: d.rua,
        numero: d.numero,
        bairro: d.bairro,
        cep: d.cep,
      }).trim())
      .filter(Boolean)

    if (!origem) {
      return erroCliente(
        'Configure o ponto de saída antes de otimizar a sequência.',
        'PONTO_SAIDA_OBRIGATORIO',
        400,
      )
    }

    if (destinos.length === 0) {
      return erroCliente(
        'Adicione ao menos um destino final antes de otimizar a sequência.',
        'DESTINO_FINAL_OBRIGATORIO',
        400,
      )
    }

    const destinoIndex = body.destino_index ?? (destinos.length - 1)
    if (!Number.isInteger(destinoIndex) || destinoIndex < 0) {
      return erroCliente('destino_index inválido', 'DESTINO_INDEX_INVALIDO', 400)
    }

    if (destinoIndex >= destinos.length) {
      return erroCliente(
        'destino_index fora da faixa de destinos da rota.',
        'DESTINO_INDEX_FORA_DA_FAIXA',
        400,
      )
    }

    const passageiros = await buscarPassageirosAtivosDaRota(supabase, rotaId)
    const ordemAntes = passageiros.map((p) => p.nome_completo)

    if (passageiros.length === 0) {
      return erroCliente(
        'Esta rota ainda não tem passageiros ativos com endereço completo para otimizar.',
        'SEM_PASSAGEIROS_PARA_OTIMIZAR',
        400,
      )
    }

    if (passageiros.length === 1) {
      return erroCliente(
        'Só há 1 passageiro ativo com endereço completo nesta rota. Adicione pelo menos mais 1 para otimizar a sequência.',
        'PASSAGEIROS_INSUFICIENTES_PARA_OTIMIZAR',
        400,
      )
    }

    const { indices, provedor } = await solicitarOrdemOtimizada({
      origem,
      destinoFinal: destinos[destinoIndex],
      passageiros,
    })

    const reordenados = reordenarPassageirosPorIndices(passageiros, indices)
    const ordemDepois = reordenados.map((p) => p.nome_completo)
    const mudou = ordemAntes.some((nome, i) => nome !== ordemDepois[i])

    if (!mudou) {
      return ok({
        status: 'sem_alteracao',
        total: passageiros.length,
        ordemAntes,
        ordemDepois,
        provedor,
      })
    }

    const updates = reordenados.map((p, index) =>
      supabase
        .from('passageiros')
        .update({ ordem_na_rota: index + 1 })
        .eq('id', p.id),
    )

    const resultados = await Promise.all(updates)
    const erro = resultados.find((r) => r.error)?.error
    if (erro) {
      throw new Error(`Não foi possível salvar a nova ordem da rota: ${erro.message}`)
    }

    return ok({
      status: 'otimizada',
      total: passageiros.length,
      ordemAntes,
      ordemDepois,
      provedor,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
