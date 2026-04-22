import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeeklyDatum {
  day: string;
  going: number;
  absent: number;
  pending: number;
}

interface WeeklyBarChartProps {
  data: WeeklyDatum[];
  height?: number;
}

interface TooltipPayload {
  dataKey: string;
  value: number;
  fill: string;
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-app-border rounded-xl px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)]">
      {label && <p className="text-xs font-bold text-ink mb-1.5 m-0">{label}</p>}
      {payload.map((e) => (
        <p key={e.dataKey} className="text-xs font-semibold m-0" style={{ color: e.fill }}>
          {e.dataKey}: <strong>{e.value}</strong>
        </p>
      ))}
    </div>
  );
}

const LEGEND = [
  { color: 'bg-success', label: 'Vão' },
  { color: 'bg-danger',  label: 'Ausentes' },
  { color: 'bg-warning', label: 'Pendentes' },
];

export function WeeklyBarChart({ data, height = 160 }: WeeklyBarChartProps) {
  return (
    <>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }} barSize={8} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--axis)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--axis)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="going"   fill="var(--success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent"  fill="var(--danger)"  radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill="var(--warning)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3.5 mt-2 flex-wrap">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-[3px] ${l.color}`} />
            <span className="text-[11px] text-ink-soft font-medium">{l.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
