/**
 * Junta os 4 campos do endereço estruturado em uma string única,
 * pronta para ser usada como argumento de busca no Google Maps.
 * Aceita campos vazios — gera "Rua X, Bairro Y" se faltar número/CEP.
 */
export interface EnderecoEstruturado {
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
}

export function formatarEnderecoCompleto(end: EnderecoEstruturado): string {
  const rua    = (end.rua    ?? '').trim();
  const numero = (end.numero ?? '').trim();
  const bairro = (end.bairro ?? '').trim();
  const cep    = (end.cep    ?? '').trim();

  const ruaCompleta = numero ? `${rua}, ${numero}`.trim().replace(/^,\s*/, '') : rua;
  const partes: string[] = [];
  if (ruaCompleta) partes.push(ruaCompleta);
  if (bairro)      partes.push(bairro);
  if (cep)         partes.push(cep);
  return partes.join(', ');
}

/**
 * Monta a URL do Google Maps com origem, destino e waypoints.
 * Formato oficial: https://developers.google.com/maps/documentation/urls/get-started
 *
 * Convenção do roteiro:
 *   - origem  = ponto_saida da rota (de onde a van parte)
 *   - paradas = sequência ordenada (passageiros + destinos intermediários + destino final)
 *   - O ÚLTIMO item da lista vira `destination`; o resto vira `waypoints`.
 *
 * Quando `optimize=true`, prefixa os waypoints com `optimize:true|` para que
 * o Google reordene-os pelo caminho mais curto. Aplica-se a TODOS os waypoints
 * (não dá para otimizar só uma parte) — quem chama decide se faz sentido.
 *
 * Retorna `null` quando não há informação suficiente para montar uma rota válida
 * (sem origem ou sem nenhuma parada).
 */
export function montarUrlGoogleMaps(
  origem: string | null | undefined,
  paradas: string[],
  options: { optimize?: boolean } = {},
): string | null {
  const o = (origem ?? '').trim();
  const limpas = paradas.map(s => (s ?? '').trim()).filter(Boolean);
  if (!o || limpas.length === 0) return null;

  const destino = limpas[limpas.length - 1];
  const waypoints = limpas.slice(0, -1);

  const params = new URLSearchParams({
    api: '1',
    origin: o,
    destination: destino,
    travelmode: 'driving',
  });
  if (waypoints.length > 0) {
    // Google Maps usa "|" para separar waypoints. URLSearchParams encoda como %7C.
    const prefix = options.optimize ? 'optimize:true|' : '';
    params.set('waypoints', prefix + waypoints.join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Abre a URL em nova aba de forma resistente a pop-up blockers.
 *
 * Browsers só permitem `window.open` em contexto síncrono de gesto do usuário.
 * Quando precisamos chamar após `await`, abrimos uma janela vazia ANTES
 * (ainda síncrono) e setamos `.location` depois.
 */
export function abrirEmNovaAba(janelaPreAberta: Window | null, url: string): void {
  if (janelaPreAberta && !janelaPreAberta.closed) {
    janelaPreAberta.location.href = url;
    return;
  }
  // Fallback: tenta abrir mesmo assim (pode ser bloqueado).
  window.open(url, '_blank', 'noopener,noreferrer');
}
