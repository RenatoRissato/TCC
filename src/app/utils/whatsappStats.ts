export interface RawWhatsAppMessageStats {
  total?: number | null;
  enviadas?: number | null;
  entregues?: number | null;
  falhas?: number | null;
  recebidas?: number | null;
}

export interface NormalizedWhatsAppMessageStats {
  total: number;
  enviadas: number;
  entregues: number;
  falhas: number;
  recebidas: number;
}

export function normalizarEstatisticasMensagens(
  raw: RawWhatsAppMessageStats,
): NormalizedWhatsAppMessageStats {
  const saidasAguardandoEntrega = raw.enviadas ?? 0;
  const entregues = raw.entregues ?? 0;
  const falhas = raw.falhas ?? 0;

  // Quando o status vira "entregue", a mensagem continua sendo uma mensagem
  // enviada. Por isso o KPI "Enviadas" soma os dois estados de saida.
  const enviadas = saidasAguardandoEntrega + entregues;
  const entreguesComFallback = entregues > 0
    ? entregues
    : Math.max(0, enviadas - falhas);

  return {
    total: raw.total ?? 0,
    enviadas,
    entregues: entreguesComFallback,
    falhas,
    recebidas: raw.recebidas ?? 0,
  };
}
