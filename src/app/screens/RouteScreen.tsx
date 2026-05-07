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

  return (
    <div className="bg-surface min-h-full relative transition-colors">
      <div className="bg-[#212529] pt-4 pb-3">
        <div className="flex items-center gap-2.5 pb-3" style={{ paddingLeft: px, paddingRight: px }}>
          {!isLg && (
            <button onClick={openDrawer} className="touch-scale shrink-0 w-10 h-10 rounded-xl bg-white/[0.08] border-[1.5px] border-white/10 flex items-center justify-center cursor-pointer" aria-label="Abrir menu de navegação">
              <Menu size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />
            </button>
          )}
          <div className="shrink-0 w-9 h-9 bg-pending rounded-[11px] flex items-center justify-center">
            <MapPin size={18} color="#212529" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold text-white m-0 leading-none">Rotas & Passageiros</h1>
            <p className="text-[11px] text-white/40 m-0">
              {list.length} cadastrados · {periodSummary.going} vão · {periodSummary.pending} pendentes
            </p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-[5px] bg-pending border-0 rounded-xl px-3 py-2 text-xs font-bold text-[#212529] cursor-pointer min-h-[38px] font-sans" aria-label="Adicionar passageiro">
            <Plus size={15} strokeWidth={3} /> Adicionar
          </button>
        </div>

        <div className="relative pb-2.5" style={{ paddingLeft: px, paddingRight: px }}>
          <Search size={16} color="rgba(255,255,255,0.35)" className="absolute top-1/2 -translate-y-[62%]" style={{ left: px + 13 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, endereço ou responsável..."
            className="w-full box-border bg-white/[0.09] border-[1.5px] border-white/[0.12] rounded-[14px] py-3 pl-10 pr-10 text-[13px] text-white outline-none font-sans min-h-12"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 -translate-y-[62%] bg-white/15 border-0 w-6 h-6 rounded-full cursor-pointer flex items-center justify-center"
              style={{ right: px + 10 }}
            >
              <X size={13} color="rgba(255,255,255,0.7)" />
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

      <div className="flex items-center bg-panel border-b border-divider transition-colors">
        {[
          { n: periodSummary.going,   color: '#198754', label: 'VAI',     I: CheckCircle2 },
          { n: periodSummary.absent,  color: '#DC3545', label: 'AUSENTE', I: XCircle },
          { n: periodSummary.pending, color: '#FD7E14', label: 'PEND.',   I: Clock },
        ].map((item, i) => (
          <div key={item.label} className={`flex-1 flex flex-col items-center py-2.5 gap-[3px] ${i < 2 ? 'border-r border-divider' : ''}`}>
            <item.I size={13} color={item.color} strokeWidth={2.5} />
            <span className="text-lg font-black leading-none" style={{ color: item.color }}>{item.n}</span>
            <span className="text-[9px] font-bold text-ink-muted tracking-[0.06em]">{item.label}</span>
          </div>
        ))}
        <div className="flex flex-col items-center py-2.5 px-3.5 gap-[3px]">
          <span className="pulse-dot inline-block w-[7px] h-[7px] rounded-full bg-[#4ADE80]" />
          <span className="text-[9px] font-bold tracking-[0.06em] text-[#4ADE80]">AO VIVO</span>
        </div>
      </div>

      <div style={{ padding: `${isDesktop ? 20 : 16}px ${px}px ${isDesktop ? 40 : 96}px` }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
            <span className="text-[52px]">🔍</span>
            <div className="text-center">
              <p className="text-base font-bold text-ink m-0 mb-1.5">Nenhum passageiro encontrado</p>
              <p className="text-[13px] text-ink-soft m-0">Ajuste os filtros ou adicione um novo passageiro</p>
            </div>
            <button onClick={openAdd} className="flex items-center gap-2 bg-pending border-0 rounded-[14px] px-6 py-3.5 text-sm font-bold text-[#212529] cursor-pointer min-h-[50px] font-sans shadow-[0_4px_16px_rgba(255,193,7,0.35)]">
              <Plus size={18} strokeWidth={3} /> Adicionar Passageiro
            </button>
          </div>
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
