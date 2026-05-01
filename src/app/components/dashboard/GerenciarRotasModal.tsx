import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  X, Plus, Trash2, MapPin, Clock, Save, Sunrise, Sun, Moon, Tag,
  Navigation, ChevronLeft, AlertCircle, Hash, Home, Mail, Flag,
} from 'lucide-react';
import { BottomSheetModal } from '../shared/BottomSheetModal';
import { FormInput } from '../shared/FormInput';
import { useAuth } from '../../context/AuthContext';
import {
  listarRotas,
  criarRota,
  atualizarRota,
  apagarRota,
} from '../../services/rotaService';
import type { RotaRow, TurnoRota, DestinoRota } from '../../types/database';

const TURNO_META: Record<TurnoRota, { label: string; color: string; Icon: typeof Sunrise }> = {
  morning:   { label: 'Manhã',  color: '#FFC107', Icon: Sunrise },
  afternoon: { label: 'Tarde',  color: '#FD7E14', Icon: Sun },
  night:     { label: 'Noite',  color: '#6C5CE7', Icon: Moon },
};

interface GerenciarRotasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const DESTINO_VAZIO: DestinoRota = { rotulo: '', rua: '', numero: '', bairro: '', cep: '' };

export function GerenciarRotasModal({ open, onOpenChange, onChanged }: GerenciarRotasModalProps) {
  const { motoristaId } = useAuth();
  const [rotas, setRotas] = useState<RotaRow[]>([]);
  const [rotaSelecionadaId, setRotaSelecionadaId] = useState<string | null>(null);
  const [criandoNova, setCriandoNova] = useState(false);

  // Form
  const [nome, setNome] = useState('');
  const [turno, setTurno] = useState<TurnoRota>('morning');
  const [horario, setHorario] = useState('');
  const [psRua, setPsRua] = useState('');
  const [psNumero, setPsNumero] = useState('');
  const [psBairro, setPsBairro] = useState('');
  const [psCep, setPsCep] = useState('');
  const [destinos, setDestinos] = useState<DestinoRota[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);

  const rotaAtual = useMemo(
    () => rotas.find(r => r.id === rotaSelecionadaId) ?? null,
    [rotas, rotaSelecionadaId],
  );

  const recarregarRotas = useCallback(async () => {
    const rs = await listarRotas();
    setRotas(rs);
    return rs;
  }, []);

  // Inicialização ao abrir
  useEffect(() => {
    if (!open) return;
    setCriandoNova(false);
    setConfirmandoApagar(false);
    recarregarRotas().then(rs => {
      setRotaSelecionadaId(rs.length > 0 ? rs[0].id : null);
    });
  }, [open, recarregarRotas]);

  // Hidratar form quando troca de rota selecionada
  useEffect(() => {
    if (criandoNova) return;
    if (!rotaAtual) {
      setNome(''); setTurno('morning'); setHorario('');
      setPsRua(''); setPsNumero(''); setPsBairro(''); setPsCep('');
      setDestinos([]);
      return;
    }
    setNome(rotaAtual.nome);
    setTurno(rotaAtual.turno);
    setHorario((rotaAtual.horario_saida ?? '').slice(0, 5));
    setPsRua(rotaAtual.ponto_saida_rua ?? '');
    setPsNumero(rotaAtual.ponto_saida_numero ?? '');
    setPsBairro(rotaAtual.ponto_saida_bairro ?? '');
    setPsCep(rotaAtual.ponto_saida_cep ?? '');
    setDestinos(Array.isArray(rotaAtual.destinos) ? rotaAtual.destinos : []);
    setConfirmandoApagar(false);
  }, [rotaAtual, criandoNova]);

  const iniciarNovaRota = () => {
    setCriandoNova(true);
    setRotaSelecionadaId(null);
    setNome(''); setTurno('morning'); setHorario('07:00');
    setPsRua(''); setPsNumero(''); setPsBairro(''); setPsCep('');
    setDestinos([]);
    setConfirmandoApagar(false);
  };

  const adicionarDestino = () => {
    setDestinos(d => [...d, { ...DESTINO_VAZIO, rotulo: `Destino ${d.length + 1}` }]);
  };

  const atualizarDestino = (idx: number, patch: Partial<DestinoRota>) => {
    setDestinos(d => d.map((dest, i) => i === idx ? { ...dest, ...patch } : dest));
  };

  const removerDestino = (idx: number) => {
    setDestinos(d => d.filter((_, i) => i !== idx));
  };

  const salvar = async () => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) { toast.error('Informe o nome da rota'); return; }

    // Filtra destinos completamente vazios (sem rótulo nem rua) para não persistir lixo
    const destinosLimpos = destinos
      .map(d => ({
        rotulo: d.rotulo.trim(),
        rua: d.rua.trim(),
        numero: d.numero.trim(),
        bairro: d.bairro.trim(),
        cep: d.cep.trim(),
      }))
      .filter(d => d.rotulo || d.rua || d.numero || d.bairro || d.cep);

    setSalvando(true);
    try {
      const enderecoSaida = {
        pontoSaidaRua:    psRua.trim() || null,
        pontoSaidaNumero: psNumero.trim() || null,
        pontoSaidaBairro: psBairro.trim() || null,
        pontoSaidaCep:    psCep.trim() || null,
      };

      if (criandoNova) {
        if (!motoristaId) { toast.error('Sessão inválida'); return; }
        const r = await criarRota({
          motoristaId,
          nome: nomeTrim,
          turno,
          horarioSaida: horario || null,
          ...enderecoSaida,
          destinos: destinosLimpos,
        });
        if (!r) { toast.error('Não foi possível criar a rota'); return; }
        toast.success('Rota criada');
        await recarregarRotas();
        setRotaSelecionadaId(r.id);
        setCriandoNova(false);
        onChanged();
      } else if (rotaAtual) {
        const ok = await atualizarRota(rotaAtual.id, {
          nome: nomeTrim,
          turno,
          horarioSaida: horario || null,
          ...enderecoSaida,
          destinos: destinosLimpos,
        });
        if (!ok) { toast.error('Não foi possível salvar'); return; }
        toast.success('Rota atualizada');
        await recarregarRotas();
        onChanged();
      }
    } finally {
      setSalvando(false);
    }
  };

  const confirmarApagar = async () => {
    if (!rotaAtual) return;
    const ok = await apagarRota(rotaAtual.id);
    if (!ok) { toast.error('Não foi possível apagar'); return; }
    toast.success('Rota removida');
    const rs = await recarregarRotas();
    setRotaSelecionadaId(rs[0]?.id ?? null);
    setConfirmandoApagar(false);
    onChanged();
  };

  return (
    <BottomSheetModal
      open={open}
      onOpenChange={onOpenChange}
      title="Gerenciar Rotas"
      hideHandle
      maxWidth={620}
    >
      <div className="flex flex-col flex-1 min-h-0 font-sans">
        {/* Header */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-divider">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-[42px] h-[42px] rounded-[14px] bg-pending/15 flex items-center justify-center">
              <Navigation size={20} color="#FFC107" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="text-[17px] font-extrabold text-ink m-0 leading-tight">Gerenciar Rotas</p>
              <p className="text-[11px] text-ink-soft m-0">Crie, edite e organize o roteiro de cada rota</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 rounded-[11px] bg-field border border-app-border cursor-pointer flex items-center justify-center"
              aria-label="Fechar"
            >
              <X size={18} className="text-ink-soft" strokeWidth={2.5} />
            </button>
          </div>

          {/* Seletor de rota (chips) */}
          <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {rotas.map(r => {
              const meta = TURNO_META[r.turno];
              const ativo = !criandoNova && rotaSelecionadaId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => { setRotaSelecionadaId(r.id); setCriandoNova(false); }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-bold cursor-pointer transition-colors min-h-[36px]"
                  style={{
                    background: ativo ? meta.color : 'var(--field)',
                    color: ativo ? '#212529' : 'var(--ink)',
                    border: `1.5px solid ${ativo ? meta.color : 'var(--app-border)'}`,
                  }}
                >
                  <meta.Icon size={13} strokeWidth={2.5} />
                  {r.nome}
                </button>
              );
            })}
            <button
              onClick={iniciarNovaRota}
              className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-[12px] bg-pending/10 border-[1.5px] border-pending/40 text-xs font-bold text-pending cursor-pointer min-h-[36px]"
            >
              <Plus size={13} strokeWidth={2.8} /> Nova
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 [-webkit-overflow-scrolling:touch]">
          {/* Estado vazio */}
          {rotas.length === 0 && !criandoNova && (
            <div className="text-center py-10">
              <p className="text-sm text-ink-soft m-0 mb-3">Nenhuma rota cadastrada.</p>
              <button
                onClick={iniciarNovaRota}
                className="inline-flex items-center gap-1.5 bg-pending text-[#212529] border-0 rounded-[12px] px-4 py-2.5 text-sm font-bold cursor-pointer min-h-[44px]"
              >
                <Plus size={16} strokeWidth={2.8} /> Criar primeira rota
              </button>
            </div>
          )}

          {(criandoNova || rotaAtual) && (
            <>
              {criandoNova && (
                <div className="flex items-center gap-2 mb-3 -mt-1">
                  <button
                    onClick={() => { setCriandoNova(false); if (rotas[0]) setRotaSelecionadaId(rotas[0].id); }}
                    className="w-7 h-7 rounded-full bg-field border border-app-border cursor-pointer flex items-center justify-center"
                    aria-label="Cancelar criação"
                  >
                    <ChevronLeft size={15} className="text-ink-soft" strokeWidth={2.5} />
                  </button>
                  <p className="text-xs font-bold text-pending m-0 tracking-[0.08em] uppercase">Nova Rota</p>
                </div>
              )}

              <FormInput
                label="Nome da rota"
                icon={Tag}
                value={nome}
                onChange={setNome}
                placeholder="Ex: Faculdade Brasil"
                required
              />

              <p className="text-xs font-bold text-ink-soft mb-1.5">Turno (define cor e ícone)</p>
              <div className="flex gap-2 mb-4">
                {(Object.keys(TURNO_META) as TurnoRota[]).map(t => {
                  const meta = TURNO_META[t];
                  const active = turno === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTurno(t)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-xs font-bold cursor-pointer transition-colors min-h-[44px]"
                      style={{
                        background: active ? `${meta.color}22` : 'var(--field)',
                        color: active ? meta.color : 'var(--ink)',
                        border: `2px solid ${active ? meta.color : 'var(--app-border)'}`,
                      }}
                    >
                      <meta.Icon size={14} strokeWidth={2.5} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <FormInput
                label="Horário de saída"
                icon={Clock}
                value={horario}
                onChange={setHorario}
                type="time"
                placeholder="07:00"
              />

              {/* Ponto de saída */}
              <p className="text-[10px] font-extrabold text-pending tracking-[0.11em] uppercase mt-1 mb-2">
                Ponto de saída da van
              </p>
              <FormInput label="Rua" icon={Home} value={psRua} onChange={setPsRua} placeholder="Ex: Rua das Acácias" />
              <div className="grid grid-cols-[1fr_1.4fr] gap-2.5">
                <FormInput label="Número" icon={Hash} value={psNumero} onChange={setPsNumero} placeholder="Ex: 123" />
                <FormInput label="Bairro" icon={MapPin} value={psBairro} onChange={setPsBairro} placeholder="Ex: Jardim América" />
              </div>
              <FormInput label="CEP" icon={Mail} value={psCep} onChange={setPsCep} placeholder="Ex: 01310-100" />

              {/* Destinos */}
              <div className="flex items-center justify-between mt-3 mb-2">
                <p className="text-[10px] font-extrabold text-pending tracking-[0.11em] uppercase m-0">
                  Destinos finais
                </p>
                <span className="text-[10px] font-bold text-ink-muted">
                  {destinos.length} cadastrado{destinos.length !== 1 ? 's' : ''}
                </span>
              </div>

              {destinos.length === 0 && (
                <div className="bg-field border-2 border-dashed border-app-border rounded-[14px] p-4 text-center mb-2">
                  <p className="text-[11px] text-ink-soft m-0">Nenhum destino cadastrado ainda.</p>
                </div>
              )}

              {destinos.map((d, idx) => (
                <DestinoCard
                  key={idx}
                  destino={d}
                  index={idx}
                  total={destinos.length}
                  onChange={(patch) => atualizarDestino(idx, patch)}
                  onRemove={() => removerDestino(idx)}
                />
              ))}

              <button
                onClick={adicionarDestino}
                className="w-full flex items-center justify-center gap-1.5 bg-field border-2 border-dashed border-app-border rounded-[12px] py-2.5 text-xs font-bold text-ink-soft cursor-pointer min-h-[44px] mb-4"
              >
                <Plus size={14} strokeWidth={2.5} /> Adicionar destino
              </button>

              {/* Ações */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="w-full flex items-center justify-center gap-2 bg-pending text-[#212529] border-0 rounded-[14px] px-5 py-3 text-sm font-extrabold cursor-pointer min-h-[50px] shadow-[0_4px_16px_rgba(255,193,7,0.35)] disabled:opacity-60"
                >
                  <Save size={16} strokeWidth={2.8} />
                  {salvando ? 'Salvando...' : (criandoNova ? 'Criar rota' : 'Salvar alterações')}
                </button>

                {!criandoNova && rotaAtual && (
                  confirmandoApagar ? (
                    <div className="flex items-center gap-2 bg-danger/10 border-[1.5px] border-danger/30 rounded-[12px] px-3 py-2.5">
                      <AlertCircle size={16} className="text-danger shrink-0" strokeWidth={2.5} />
                      <p className="flex-1 text-[12px] text-danger font-semibold m-0">Apagar esta rota?</p>
                      <button
                        onClick={() => setConfirmandoApagar(false)}
                        className="px-2.5 py-1.5 rounded-[8px] bg-transparent border border-app-border text-[11px] font-bold text-ink-soft cursor-pointer"
                      >Cancelar</button>
                      <button
                        onClick={confirmarApagar}
                        className="px-2.5 py-1.5 rounded-[8px] bg-danger border-0 text-[11px] font-bold text-white cursor-pointer"
                      >Apagar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoApagar(true)}
                      className="w-full flex items-center justify-center gap-1.5 bg-transparent border-2 border-danger/40 text-danger rounded-[14px] px-5 py-2.5 text-xs font-bold cursor-pointer min-h-[42px]"
                    >
                      <Trash2 size={14} strokeWidth={2.5} /> Apagar rota
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </BottomSheetModal>
  );
}

// ============ Sub-componente: card de destino ============

interface DestinoCardProps {
  destino: DestinoRota;
  index: number;
  total: number;
  onChange: (patch: Partial<DestinoRota>) => void;
  onRemove: () => void;
}

function DestinoCard({ destino, index, total, onChange, onRemove }: DestinoCardProps) {
  return (
    <div className="bg-field border border-app-border rounded-[14px] p-3 mb-3" style={{ borderLeft: '4px solid #FD7E14' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold bg-warning/20 text-warning">
          {index + 1}
        </span>
        <Flag size={13} className="text-warning" strokeWidth={2.5} />
        <p className="flex-1 text-[11px] font-bold text-ink-soft m-0 tracking-[0.06em] uppercase">
          Destino {index + 1}{total > 1 && index === total - 1 ? ' (final)' : ''}
        </p>
        <button
          onClick={onRemove}
          aria-label={`Remover destino ${index + 1}`}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center cursor-pointer bg-danger/10 border border-app-border"
        >
          <Trash2 size={12} className="text-danger" strokeWidth={2.5} />
        </button>
      </div>

      <FormInput
        label="Rótulo"
        icon={Tag}
        value={destino.rotulo}
        onChange={(v) => onChange({ rotulo: v })}
        placeholder="Ex: Faculdade Brasil"
      />
      <FormInput
        label="Rua"
        icon={Home}
        value={destino.rua}
        onChange={(v) => onChange({ rua: v })}
        placeholder="Ex: Rua das Flores"
      />
      <div className="grid grid-cols-[1fr_1.4fr] gap-2.5">
        <FormInput
          label="Número"
          icon={Hash}
          value={destino.numero}
          onChange={(v) => onChange({ numero: v })}
          placeholder="Ex: 100"
        />
        <FormInput
          label="Bairro"
          icon={MapPin}
          value={destino.bairro}
          onChange={(v) => onChange({ bairro: v })}
          placeholder="Ex: Centro"
        />
      </div>
      <FormInput
        label="CEP"
        icon={Mail}
        value={destino.cep}
        onChange={(v) => onChange({ cep: v })}
        placeholder="Ex: 01310-100"
      />
    </div>
  );
}
