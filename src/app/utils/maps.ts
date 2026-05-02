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

export function deveAbrirMapsNoMesmoContexto(userAgent = globalThis.navigator?.userAgent ?? ''): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
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
 * Retorna `null` quando não há informação suficiente para montar uma rota válida
 * (sem origem ou sem nenhuma parada).
 */
export function montarUrlGoogleMaps(
  origem: string | null | undefined,
  paradas: string[],
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
    // Importante: NÃO usar o prefixo "optimize:true|" em URLs do Google Maps.
    // Na prática, o Maps Web pode interpretar esse prefixo como uma parada
    // literal e inserir um waypoint fantasma, como "Optimize Consultoria".
    // Aqui preservamos estritamente a ordem definida pela aplicação.
    params.set('waypoints', waypoints.join('|'));
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
  if (deveAbrirMapsNoMesmoContexto()) {
    window.location.assign(url);
    return;
  }

  if (janelaPreAberta && !janelaPreAberta.closed) {
    janelaPreAberta.location.replace(url);
    janelaPreAberta.focus();
    return;
  }
  // Fallback: tenta abrir mesmo assim (pode ser bloqueado).
  const novaJanela = window.open(url, '_blank');
  if (novaJanela) {
    try {
      novaJanela.opener = null;
      novaJanela.focus();
    } catch {
      // Ignora restrições específicas do navegador.
    }
  }
}
