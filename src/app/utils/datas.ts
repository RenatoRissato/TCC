/**
 * Helpers de data no fuso de Brasilia (UTC-3).
 *
 * Por que nao usar `new Date().toISOString().slice(0, 10)`?
 * Aquela formula retorna a data em UTC. A noite no Brasil (>= 21h), UTC ja
 * pulou pro dia seguinte, entao o ISO retornado fica um dia a frente do que
 * o usuario ve no relogio. Como toda viagem no banco usa data Brasil
 * (gravada pelas Edge Functions com fuso explicito), querer "hoje" com
 * UTC quebra o cruzamento — passageiros aparecem como pendentes quando
 * ja deveriam mostrar a confirmacao recebida.
 *
 * A solucao usa Intl.DateTimeFormat com timeZone fixo em America/Sao_Paulo,
 * mesma estrategia das Edge Functions (`_shared/viagem.ts`).
 */

const TIME_ZONE_BR = 'America/Sao_Paulo';

/** Data em ISO YYYY-MM-DD considerando o fuso de Brasilia. */
export function dataBrasilISO(date: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE_BR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => partes.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
