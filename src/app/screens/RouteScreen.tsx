import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Search, X, MapPin, CheckCircle2, XCircle, Clock, Plus, Trash2, Menu,
} from 'lucide-react';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';
import { usePassengers, type PassengerFilter, type PassengerPeriod } from '../hooks/usePassengers';
import { listarRotas } from '../services/rotaService';
import type { RotaRow } from '../types/database';
import { PassengerCard } from '../components/passengers/PassengerCard';
import { PassengerFilters } from '../components/passengers/PassengerFilters';
import { PassengerForm } from '../components/passengers/PassengerForm';
import { BottomSheetModal } from '../components/shared/BottomSheetModal';
import { EmptyState } from '../components/shared/EmptyState';
import { AnimatedNumber } from '../components/shared/AnimatedNumber';
import type { Passenger } from '../types';

function FAB({ onClick, isDesktop }: { onClick: () => void; isDesktop: boolean }) {
  return (
    <button
      onClick={onClick}
      className="touch-scale fixed right-5 z-[100] w-[58px] h-[58px] rounded-[18px] border-0 cursor-pointer flex items-center justify-center bg-[linear-gradient(135deg,#FFC107,#E6A800)] shadow-[0_6px_24px_rgba(255,193,7,0.55),0_2px_8px_rgba(0,0,0,0.2)] transition-all"
      style={{ bottom: isDesktop ? 32 : 82, right: isDesktop ? 36 : 20 }}
      aria-label="Adicionar novo passageiro"
    >
      <Plus size={28} color="#212529" strokeWidth={3} />
    </button>
  );
}

export function RouteScreen() {
  const { isDesktop, isLg, isMd, isXxl } = useBreakpoints();
  const { openDrawer } = useNavDrawer();

  const [searchParams, setSearchParams] = useSearchParams();
  const rotaParam = searchParams.get('rota') ?? 'all';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PassengerFilter>('all');
  const [period, setPeriod] = useState<PassengerPeriod>(rotaParam);
  const [rotas, setRotas] = useState<RotaRow[]>([]);

  useEffect(() => {
    listarRotas().then(setRotas);
  }, []);

  useEffect(() => {
    setPeriod((atual) => (atual === rotaParam ? atual : rotaParam));
  }, [rotaParam]);

  const handlePeriodChange = useCallback((p: PassengerPeriod) => {
    setPeriod(p);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p === 'all') next.delete('rota');
      else next.set('rota', p);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Passenger | null>(null);
  const [delTarget, setDelTarget] = useState<Passenger | null>(null);

  const { list, filtered, counts, periodSummary, add, edit, remove } = usePassengers({ search, filter, period });

  const openAdd = () => { setEditing(null); setModal('add'); };
  const openEdit = useCallback((p: Passenger) => { setEditing(p); setModal('edit'); }, []);
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = useCallback((form: Parameters<typeof add>[0], id?: string) => {
    if (id !== undefined) edit(id, form); else add(form);
    closeModal();
  }, [add, edit]);

  const px = isDesktop ? 32 : isMd ? 24 : 16;
  const cardCols = isXxl ? 'repeat(3,1fr)' : isMd ? 'repeat(2,1fr)' : '1fr';

  // Subtitulo contextual: indica qual filtro de rota esta ativo. Antes
  // ficava uma linha com numeros (cadastrados, vao, pendentes) que ja
  // aparecem na strip de KPIs logo abaixo — pura duplicacao.
  const rotaSelecionada = period === 'all'
    ? null
    : rotas.find((r) => r.id === period);
  const subtitulo = rotaSelecionada
    ? `Filtrando · ${rotaSelecionada.nome}`
    : `${rotas.length} ${rotas.length === 1 ? 'rota ativa' : 'rotas ativas'}`;

  return (
    <div className="bg-surface min-h-full relative transition-colors">
      {/* Header com atmosfera: gradient base + halo amarelo difuso atras do
          titulo. Sem mudar a paleta — so adiciona profundidade. */}
      <div className="relative bg-[linear-gradient(180deg,#1A1D23_0%,#212529_100%)] pt-4 pb-3 overflow-hidden">
        {/* Halo amarelo radial — fica atras do icone/titulo, da volume sem
            poluir. Pointer-events:none pra nao bloquear cliques. */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 w-[420px] h-[220px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 18% 0%, rgba(255,193,7,0.14) 0%, transparent 62%)',
          }}
        />

        <div className="relative flex items-center gap-3 pb-3.5" style={{ paddingLeft: px, paddingRight: px }}>
          {!isLg && (
            <button
              onClick={openDrawer}
              className="touch-scale shrink-0 w-11 h-11 rounded-[14px] bg-white/[0.06] border-[1.5px] border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/[0.1] transition-colors"
              aria-label="Abrir menu de navegação"
            >
              <Menu size={18} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
            </button>
          )}

          {/* Icone pin maior, com gradient amarelo + glow externo amarelo —
              vira ancora visual do header em vez de tile pequeno chapado. */}
          <div
            className="shrink-0 w-12 h-12 rounded-[15px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #FFD54F 0%, #FFC107 50%, #E6A800 100%)',
              boxShadow: '0 6px 22px -6px rgba(255,193,7,0.6), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
          >
            <MapPin size={22} color="#212529" strokeWidth={2.5} />
          </div>

          <div className="flex-1 min-w-0">
            <h1
              className="text-[22px] font-black text-white m-0 leading-none tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              Rotas & Passageiros
            </h1>
            <p className="text-[11.5px] text-white/45 m-0 mt-1.5 font-medium truncate">
              {subtitulo}
            </p>
          </div>
        </div>

        <div className="relative pb-2.5" style={{ paddingLeft: px, paddingRight: px }}>
          <Search size={16} color="rgba(255,255,255,0.4)" className="absolute top-1/2 -translate-y-[62%] z-10" style={{ left: px + 14 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, endereço ou responsável..."
            className="w-full box-border bg-white/[0.06] border-[1.5px] border-white/[0.10] rounded-[14px] py-3 pl-10 pr-10 text-[13px] text-white placeholder:text-white/35 outline-none font-sans min-h-12 transition-[border-color,background-color] focus:bg-white/[0.09] focus:border-pending/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 -translate-y-[62%] bg-white/15 border-0 w-6 h-6 rounded-full cursor-pointer flex items-center justify-center hover:bg-white/25 transition-colors"
              style={{ right: px + 10 }}
              aria-label="Limpar busca"
            >
              <X size={13} color="rgba(255,255,255,0.8)" />
            </button>
          )}
        </div>

        <PassengerFilters
          period={period}
          filter={filter}
          counts={counts}
          paddingX={px}
          rotas={rotas}
          onPeriodChange={handlePeriodChange}
          onFilterChange={setFilter}
        />
      </div>

      {/* Strip de KPIs refeita: 3 cards com tint da cor de status + AO VIVO
          como pill compacto. Numeros via AnimatedNumber pra reagir quando
          confirmacoes chegam em realtime. */}
      <div
        className="flex items-stretch gap-2 bg-panel border-b border-divider transition-colors"
        style={{ paddingLeft: px, paddingRight: px, paddingTop: 10, paddingBottom: 10 }}
      >
        {[
          { n: periodSummary.going,   color: '#198754', tint: 'rgba(25,135,84,0.10)',  ring: 'rgba(25,135,84,0.22)',  label: 'VAI',     I: CheckCircle2 },
          { n: periodSummary.absent,  color: '#DC3545', tint: 'rgba(220,53,69,0.08)',  ring: 'rgba(220,53,69,0.22)',  label: 'AUSENTE', I: XCircle },
          { n: periodSummary.pending, color: '#FD7E14', tint: 'rgba(253,126,20,0.10)', ring: 'rgba(253,126,20,0.22)', label: 'PEND.',   I: Clock },
        ].map((item) => (
          <div
            key={item.label}
            className="flex-1 flex items-center gap-2.5 rounded-[12px] px-3 py-2 transition-colors"
            style={{ background: item.tint, border: `1px solid ${item.ring}` }}
          >
            <div
              className="shrink-0 w-7 h-7 rounded-[9px] flex items-center justify-center"
              style={{ background: `${item.color}26` }}
            >
              <item.I size={14} color={item.color} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[17px] font-black leading-none" style={{ color: item.color }}>
                <AnimatedNumber value={item.n} />
              </span>
              <span className="text-[9px] font-bold text-ink-muted tracking-[0.08em] mt-1 uppercase">
                {item.label}
              </span>
            </div>
          </div>
        ))}

        {/* AO VIVO: pill vertical com pulse, marca a conexao em tempo real */}
        <div
          className="flex flex-col items-center justify-center gap-1 rounded-[12px] px-3 shrink-0"
          style={{
            background: 'rgba(74,222,128,0.10)',
            border: '1px solid rgba(74,222,128,0.28)',
          }}
          aria-label="Atualizacoes em tempo real ativas"
        >
          <span className="relative inline-flex">
            <span aria-hidden="true" className="sr-pulse-ring absolute inset-0 rounded-full bg-[#4ADE80]/50" />
            <span className="relative inline-block w-2 h-2 rounded-full bg-[#4ADE80]" />
          </span>
          <span className="text-[9px] font-extrabold tracking-[0.1em] text-[#4ADE80]">AO VIVO</span>
        </div>
      </div>

      <div style={{ padding: `${isDesktop ? 20 : 16}px ${px}px ${isDesktop ? 40 : 96}px` }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum passageiro encontrado"
            description="Ajuste os filtros ou adicione um novo passageiro para começar a montar a rota."
            action={
              <button
                onClick={openAdd}
                className="sr-press flex items-center gap-2 bg-pending border-0 rounded-[14px] px-6 py-3.5 text-sm font-bold text-[#212529] cursor-pointer min-h-[50px] font-sans shadow-[0_4px_16px_rgba(255,193,7,0.35)]"
              >
                <Plus size={18} strokeWidth={3} /> Adicionar Passageiro
              </button>
            }
          />
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: cardCols }}>
            {filtered.map((p, i) => (
              <PassengerCard
                key={p.id}
                passenger={p}
                idx={i}
                onEdit={openEdit}
                onDelete={setDelTarget}
              />
            ))}
          </div>
        )}
      </div>

      <FAB onClick={openAdd} isDesktop={isDesktop} />

      <BottomSheetModal
        open={modal !== null}
        onOpenChange={(open) => { if (!open) closeModal(); }}
        title={modal === 'edit' ? 'Editar Passageiro' : 'Novo Passageiro'}
        hideHandle
      >
        {modal !== null && (
          <PassengerForm
            editTarget={modal === 'edit' ? editing : null}
            onSave={handleSave}
            onClose={closeModal}
          />
        )}
      </BottomSheetModal>

      <BottomSheetModal
        open={delTarget !== null}
        onOpenChange={(open) => { if (!open) setDelTarget(null); }}
        title="Remover Passageiro"
        hideHandle
        forceCenter
        maxWidth={340}
      >
        {delTarget && (
          <div className="p-6 font-sans">
            <div className="w-14 h-14 bg-danger/[0.12] rounded-[18px] flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} className="text-danger" strokeWidth={2} />
            </div>
            <p className="text-lg font-extrabold text-ink m-0 mb-2 text-center">Remover Passageiro?</p>
            <p className="text-[13px] text-ink-soft m-0 mb-6 text-center leading-normal">
              Tem certeza que deseja remover <strong className="text-ink">{delTarget.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDelTarget(null)}
                className="flex-1 bg-transparent border-2 border-app-border rounded-[13px] py-3 text-sm font-bold text-ink-soft cursor-pointer min-h-12 font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={() => { remove(delTarget.id); setDelTarget(null); }}
                className="flex-1 bg-danger border-0 rounded-[13px] py-3 text-sm font-bold text-white cursor-pointer min-h-12 font-sans shadow-[0_4px_16px_rgba(220,53,69,0.35)]"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  );
}
