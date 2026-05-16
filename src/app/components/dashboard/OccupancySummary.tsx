import { TrendingUp } from 'lucide-react';
import { DonutRing } from '../charts/DonutRing';
import {
  STATUS_UI_DETALHADO_META,
  STATUS_UI_DETALHADO_ORDEM,
} from '../../utils/confirmacaoStatusMeta';
import type { Summary } from '../../types';

interface OccupancySummaryProps {
  summary: Summary;
}

export function OccupancySummary({ summary }: OccupancySummaryProps) {
  // Resposta = quem deixou de estar pendente. Inclui as 3 confirmações + não vai.
  const respostas = summary.total - summary.pending;
  const pct = summary.total > 0 ? Math.round((respostas / summary.total) * 100) : 0;

  // Quebra detalhada — fallback para zeros se o consumer não preencheu.
  const det = summary.detalhado ?? {
    ida_e_volta: 0, somente_ida: 0, somente_volta: 0, nao_vai: 0, pendente: 0,
  };

  // Fatias do donut na ordem canônica (mesma ordem da lista lateral).
  const segmentos = STATUS_UI_DETALHADO_ORDEM.map((status) => ({
    valor: det[status],
    cor: STATUS_UI_DETALHADO_META[status].color,
  }));

  return (
    <div className="rounded-3xl overflow-hidden mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] bg-[linear-gradient(145deg,#1C2128,#2C3440)] dark:bg-[linear-gradient(145deg,#161B22,#1C2128)]">
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-white/[0.06]">
        <div>
          <p className="text-[10px] font-extrabold text-white/40 tracking-[0.12em] uppercase mb-0.5 m-0">RESUMO DO DIA</p>
          <p className="text-sm font-bold text-white m-0">Todas as Rotas</p>
        </div>
        <div className="flex items-center gap-[5px] bg-[rgba(74,222,128,0.12)] rounded-[20px] px-2.5 py-[5px]">
          <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
          <span className="text-[11px] font-bold text-[#4ADE80]">AO VIVO</span>
        </div>
      </div>

      <div className="flex items-center gap-3 px-3.5 py-4">
        <DonutRing total={summary.total} segmentos={segmentos} size={152} />
        <div className="flex-1 flex flex-col gap-[6px] min-w-0">
          {STATUS_UI_DETALHADO_ORDEM.map((status) => {
            const meta = STATUS_UI_DETALHADO_META[status];
            const valor = det[status];
            return (
              <div
                key={status}
                className="flex items-center gap-[9px] rounded-[12px] px-[10px] py-[7px]"
                style={{
                  background: `${meta.color}1F`,
                  border: `1.5px solid ${meta.color}4D`,
                }}
              >
                <meta.Icon size={15} color={meta.color} strokeWidth={2.5} />
                <div className="min-w-0">
                  <p className="text-[18px] font-black m-0 leading-none" style={{ color: meta.color }}>
                    {valor}
                  </p>
                  <p className="text-[9px] font-bold text-white/55 m-0 tracking-[0.04em] truncate uppercase">
                    {meta.labelCompacto}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-[18px] pb-4">
        <div className="flex justify-between mb-[5px]">
          <span className="text-[11px] text-white/40 font-medium flex items-center gap-1">
            <TrendingUp size={10} />
            Respostas recebidas
          </span>
          <span className="text-[11px] font-bold text-pending">{pct}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.08] rounded-md overflow-hidden">
          <div
            className="h-full bg-[linear-gradient(90deg,#198754,#4ADE80)] rounded-md transition-[width] duration-600"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
