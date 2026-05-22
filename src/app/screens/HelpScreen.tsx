import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Search, ChevronDown, BookOpen, X, Menu, HelpCircle, Inbox,
} from 'lucide-react';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';
import { CATEGORIAS_FAQ, FAQS, type FaqItem } from '../data/faqs';

function normalizar(texto: string): string {
  // Remove acentos e baixa caixa pra busca tolerante (encontrar "rota" achando "Rotação").
  // Usa escape Unicode ̀-ͯ (combining diacritic marks) em vez de
  // colocar os caracteres literalmente no regex — alguns minificadores
  // corrompem caracteres combining no bundle final.
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Renderiza a resposta com parágrafos simples — sem markdown completo.
function RespostaTexto({ texto }: { texto: string }) {
  const paragrafos = texto.split(/\n\s*\n/);
  return (
    <>
      {paragrafos.map((p, i) => (
        <p
          key={i}
          className="m-0 mb-2 last:mb-0 text-[13px] leading-relaxed text-ink-soft whitespace-pre-line"
        >
          {p}
        </p>
      ))}
    </>
  );
}

interface FaqRowProps {
  item: FaqItem;
  aberto: boolean;
  onToggle: () => void;
}
function FaqRow({ item, aberto, onToggle }: FaqRowProps) {
  return (
    <div className={`sr-card-lift bg-panel border-[1.5px] rounded-[14px] overflow-hidden transition-all ${aberto ? 'border-[#14B8A6]/40' : 'border-app-border'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-0 cursor-pointer text-left"
      >
        <span className="flex-1 text-[13.5px] font-bold text-ink m-0">{item.pergunta}</span>
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: aberto ? 'rgba(20,184,166,0.15)' : 'var(--field)',
            color: aberto ? '#14B8A6' : 'var(--ink-soft)',
          }}
        >
          <ChevronDown
            size={16}
            className="transition-transform"
            strokeWidth={2.5}
            style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </span>
      </button>
      {aberto && (
        <div className="px-4 pb-4 border-t border-divider pt-3 sr-fade-up">
          <RespostaTexto texto={item.resposta} />
        </div>
      )}
    </div>
  );
}

export function HelpScreen() {
  const navigate = useNavigate();
  const { isLg, isDesktop, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string>('todas');
  const [aberto, setAberto] = useState<Set<string>>(new Set());

  const toggleAberto = (id: string) => {
    setAberto((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const filtradas = useMemo<FaqItem[]>(() => {
    const buscaNorm = normalizar(busca.trim());
    return FAQS.filter((f) => {
      if (categoria !== 'todas' && f.categoria !== categoria) return false;
      if (!buscaNorm) return true;
      const alvo = normalizar(`${f.pergunta} ${f.resposta}`);
      return alvo.includes(buscaNorm);
    });
  }, [busca, categoria]);

  // Conta itens por categoria pra mostrar nos chips
  const contagens = useMemo(() => {
    const buscaNorm = normalizar(busca.trim());
    const base: Record<string, number> = { todas: 0 };
    for (const c of CATEGORIAS_FAQ) base[c.id] = 0;
    for (const f of FAQS) {
      if (buscaNorm) {
        const alvo = normalizar(`${f.pergunta} ${f.resposta}`);
        if (!alvo.includes(buscaNorm)) continue;
      }
      base.todas++;
      base[f.categoria]++;
    }
    return base;
  }, [busca]);

  // Agrupa as filtradas por categoria pra exibir com cabeçalhos quando "todas"
  const porCategoria = useMemo(() => {
    if (categoria !== 'todas') return null;
    const grupos: { categoria: typeof CATEGORIAS_FAQ[number]; itens: FaqItem[] }[] = [];
    for (const c of CATEGORIAS_FAQ) {
      const itens = filtradas.filter((f) => f.categoria === c.id);
      if (itens.length > 0) grupos.push({ categoria: c, itens });
    }
    return grupos;
  }, [filtradas, categoria]);

  const px = isDesktop ? 36 : isMd ? 24 : 16;

  return (
    <div className="bg-surface min-h-full transition-colors">
      <header
        className="relative overflow-hidden pt-4 pb-5"
        style={{
          // Mesmo gradient base dos outros headers do app — consistencia.
          // Cor temática vem via halos coloridos no canto, nao no fundo.
          background: 'linear-gradient(155deg, #0A0D12 0%, #161B22 55%, #1A1F26 100%)',
          paddingLeft: px,
          paddingRight: px,
        }}
      >
        {/* Halos radiais TEAL (cor da Central de Ajuda no Settings) — sutis,
            dao identidade tematica ao header sem chocar com a paleta. */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-[360px] h-[360px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 65%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 -left-20 w-[280px] h-[280px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 65%)' }}
        />

        <div className="relative flex items-center gap-2.5 mb-3.5">
          {!isLg && (
            <button
              onClick={openDrawer}
              className="touch-scale sr-press shrink-0 w-11 h-11 rounded-[14px] bg-white/[0.06] border-[1.5px] border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/[0.1] transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={18} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="touch-scale sr-press shrink-0 w-11 h-11 rounded-[14px] bg-white/[0.06] border-[1.5px] border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/[0.1] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
          </button>

          {/* Icone tematico — gradient teal 3-stops + glow + inset highlight,
              mesma assinatura visual dos icones de header de outras telas
              (bus amarelo, pin amarelo, avatar amarelo) — so muda a cor. */}
          <div
            className="shrink-0 w-12 h-12 rounded-[15px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 50%, #0F766E 100%)',
              boxShadow: '0 6px 22px -6px rgba(20,184,166,0.6), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
          >
            <BookOpen size={22} color="#fff" strokeWidth={2.2} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-[#2DD4BF] tracking-[0.14em] uppercase m-0 leading-none">
              Suporte & Ajuda
            </p>
            <h1 className="text-[22px] font-black text-white m-0 mt-1.5 leading-none tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Central de Ajuda
            </h1>
          </div>
        </div>

        {/* Campo de busca — focus state troca pra teal pra reforcar contexto */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 z-10"
            strokeWidth={2}
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar dúvidas (ex: WhatsApp, rota, finalizar...)"
            className="relative w-full box-border bg-white/[0.06] border-[1.5px] border-white/10 rounded-[14px] pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/35 outline-none font-sans min-h-[46px] transition-[border-color,background-color] focus:border-[#14B8A6]/55 focus:bg-white/[0.09]"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/15 border-0 flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors z-10"
            >
              <X size={13} className="text-white/80" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </header>

      <div style={{ padding: `${isDesktop ? 24 : 16}px ${px}px ${isDesktop ? 36 : 80}px` }}>
        {/* Chips de categoria — mesmo padrao dos chips de status em RouteScreen:
            sr-no-scrollbar pra esconder a barra horizontal, sr-press pro feedback
            tatil, ativo ganha glow teal. */}
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-3 mb-1 sr-no-scrollbar">
          {[{ id: 'todas', label: 'Todas', emoji: '✨' }, ...CATEGORIAS_FAQ].map((c) => {
            const ativa = categoria === c.id;
            const qtd = contagens[c.id] ?? 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoria(c.id)}
                aria-pressed={ativa}
                className="sr-press shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold cursor-pointer transition-all min-h-[38px]"
                style={{
                  background: ativa ? '#14B8A6' : 'var(--field)',
                  color: ativa ? '#fff' : 'var(--ink-soft)',
                  border: `1.5px solid ${ativa ? '#14B8A6' : 'var(--app-border)'}`,
                  boxShadow: ativa ? '0 6px 18px rgba(20,184,166,0.35)' : 'none',
                }}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
                <span
                  className="text-[10px] font-extrabold rounded-full px-1.5 py-[1px] min-w-[18px] text-center leading-none flex items-center justify-center"
                  style={{
                    background: ativa ? 'rgba(255,255,255,0.25)' : 'rgba(20,184,166,0.12)',
                    color: ativa ? '#fff' : '#14B8A6',
                  }}
                >
                  {qtd}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista de FAQs */}
        {filtradas.length === 0 ? (
          <div className="rounded-[16px] border-[1.5px] border-dashed border-app-border bg-panel/50 px-5 py-10 text-center mt-4">
            <Inbox size={32} className="mx-auto mb-3 text-ink-muted" strokeWidth={1.5} />
            <p className="text-sm font-bold text-ink m-0 mb-1">Nada encontrado</p>
            <p className="text-[12px] text-ink-soft m-0">
              Tente buscar outras palavras ou voltar a categoria para "Todas".
            </p>
          </div>
        ) : porCategoria ? (
          <div className="flex flex-col gap-5">
            {porCategoria.map(({ categoria: cat, itens }) => (
              <section key={cat.id}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">{cat.emoji}</span>
                  <h2 className="text-[11px] font-extrabold text-ink-soft tracking-[0.1em] uppercase m-0">
                    {cat.label}
                  </h2>
                  <span className="text-[10px] text-ink-muted font-bold">({itens.length})</span>
                </div>
                <div className="flex flex-col gap-2">
                  {itens.map((f) => (
                    <FaqRow
                      key={f.id}
                      item={f}
                      aberto={aberto.has(f.id)}
                      onToggle={() => toggleAberto(f.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtradas.map((f) => (
              <FaqRow
                key={f.id}
                item={f}
                aberto={aberto.has(f.id)}
                onToggle={() => toggleAberto(f.id)}
              />
            ))}
          </div>
        )}

        {/* Footer "Não encontrou?" — leva de volta para Configurações */}
        <div className="mt-7 rounded-[16px] bg-panel border-[1.5px] border-app-border px-5 py-4 flex items-center gap-3.5">
          <div className="w-11 h-11 shrink-0 rounded-[12px] bg-pending/12 flex items-center justify-center">
            <HelpCircle size={20} className="text-pending" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-ink m-0">Não encontrou o que precisava?</p>
            <p className="text-[12px] text-ink-soft m-0 leading-relaxed">
              Volte para Configurações e use outro canal de suporte.
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-pending/40 bg-pending/15 px-3 py-2 text-[12px] font-bold text-pending cursor-pointer min-h-[40px]"
          >
            Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
