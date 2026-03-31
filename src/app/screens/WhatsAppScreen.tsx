import { useState } from 'react';
import {
  Wifi, WifiOff, RefreshCw, Link2, Link2Off, Clock, Send,
  CheckCircle2, AlertTriangle, MessageCircle, Sunrise, Sun, Moon,
  Save, RotateCcw, Menu,
} from 'lucide-react';
import { useColors, useTheme } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';

function Spinner() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function QRPlaceholder() {
  return (
    <svg width={164} height={164} viewBox="0 0 164 164" style={{ borderRadius: 12 }}>
      <rect width={164} height={164} fill="white" />
      {/* corners */}
      <rect x={10} y={10} width={42} height={42} rx={5} fill="#212529" /><rect x={16} y={16} width={30} height={30} rx={2} fill="white" /><rect x={22} y={22} width={18} height={18} rx={1} fill="#212529" />
      <rect x={112} y={10} width={42} height={42} rx={5} fill="#212529" /><rect x={118} y={16} width={30} height={30} rx={2} fill="white" /><rect x={124} y={22} width={18} height={18} rx={1} fill="#212529" />
      <rect x={10} y={112} width={42} height={42} rx={5} fill="#212529" /><rect x={16} y={118} width={30} height={30} rx={2} fill="white" /><rect x={22} y={124} width={18} height={18} rx={1} fill="#212529" />
      {/* data cells */}
      {[62,68,74,80,86,92,98].map(x =>
        [62,68,74,80,86,92,98].map(y =>
          ((x + y) % 14 < 7) ? <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} rx={0.5} fill="#212529" /> : null
        )
      )}
      {/* brand dot */}
      <rect x={70} y={70} width={24} height={24} rx={7} fill="#FFC107" />
      <text x={82} y={88} textAnchor="middle" fontSize={14}>🚌</text>
    </svg>
  );
}

function SLabel({ children, c }: { children: React.ReactNode; c: ReturnType<typeof useColors> }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8, color: c.sectionTitle }}>
      <span style={{ width: 3, height: 13, background: '#25D366', borderRadius: 2, display: 'inline-block' }} />
      {children}
    </p>
  );
}

function TimeRow({ Icon, label, sub, color, value, onChange, c }: {
  Icon: React.ComponentType<any>; label: string; sub: string; color: string;
  value: string; onChange: (v: string) => void; c: ReturnType<typeof useColors>;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: '0 0 1px' }}>{label}</p>
        <p style={{ fontSize: 12, color: c.textSec, margin: 0 }}>{sub}</p>
      </div>
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
        style={{ background: c.inputBg, border: `2px solid ${c.inputBorder}`, borderRadius: 12, padding: '8px 12px', fontSize: 14, fontWeight: 700, color: c.text, outline: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer', minHeight: 44, flexShrink: 0 }}
        onFocus={e => { e.currentTarget.style.borderColor = '#25D366'; }}
        onBlur={e => { e.currentTarget.style.borderColor = c.inputBorder; }}
      />
    </div>
  );
}

const DEFAULT_TEMPLATE = `Olá, [RESPONSÁVEL]! 👋

Amanhã [NOME] vai usar a van escolar?

1️⃣ SIM — vai normalmente
2️⃣ NÃO — não vai amanhã

Responda com 1 ou 2. Obrigado! 🚌`;

export function WhatsAppScreen() {
  const c             = useColors();
  const { isDark }    = useTheme();
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();

  const [connected,    setConnected]    = useState(true);
  const [connecting,   setConnecting]   = useState(false);
  const [showQR,       setShowQR]       = useState(false);
  const [schedSaved,   setSchedSaved]   = useState(false);
  const [tmplSaved,    setTmplSaved]    = useState(false);
  const [morning,      setMorning]      = useState('06:30');
  const [afternoon,    setAfternoon]    = useState('11:45');
  const [night,        setNight]        = useState('18:15');
  const [template,     setTemplate]     = useState(DEFAULT_TEMPLATE);

  const handleConnect = async () => {
    if (connected) { setConnected(false); setShowQR(false); return; }
    setConnecting(true); setShowQR(true);
    await new Promise(r => setTimeout(r, 2200));
    setConnecting(false); setConnected(true); setShowQR(false);
  };

  const saveSchedule = async () => {
    await new Promise(r => setTimeout(r, 500));
    setSchedSaved(true); setTimeout(() => setSchedSaved(false), 2000);
  };

  const saveTemplate = async () => {
    await new Promise(r => setTimeout(r, 500));
    setTmplSaved(true); setTimeout(() => setTmplSaved(false), 2000);
  };

  const DIV = <div style={{ height: 1, background: c.divider, margin: '0 16px' }} />;
  const px  = isDesktop ? 32 : isMd ? 24 : 16;

  /* ── Connection card ─────────────────────────── */
  const ConnectionCard = (
    <section style={{ marginBottom: isDesktop ? 0 : 20 }}>
      <SLabel c={c}>Status da Conexão</SLabel>
      <div style={{ background: c.card, borderRadius: 24, overflow: 'hidden', boxShadow: c.cardShadow, border: `1.5px solid ${connected ? 'rgba(37,211,102,0.25)' : 'rgba(220,53,69,0.25)'}`, transition: 'background 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: connected ? 'linear-gradient(135deg,rgba(37,211,102,.1),rgba(18,140,126,.06))' : 'linear-gradient(135deg,rgba(220,53,69,.1),rgba(220,53,69,.04))', borderBottom: `1px solid ${c.divider}` }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: connected ? 'rgba(37,211,102,.15)' : 'rgba(220,53,69,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {connected ? <Wifi size={26} color="#25D366" strokeWidth={2} /> : <WifiOff size={26} color="#DC3545" strokeWidth={2} />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: c.text, margin: '0 0 3px' }}>{connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}</p>
            <p style={{ fontSize: 12, color: c.textSec, margin: 0 }}>{connected ? 'Bot ativo · Recebendo confirmações automaticamente' : 'Escaneie o QR Code para conectar'}</p>
          </div>
        </div>

        {connected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: `1px solid ${c.divider}` }}>
            <CheckCircle2 size={16} color="#25D366" strokeWidth={2.5} />
            <span style={{ fontSize: 13, color: c.textSec, fontWeight: 500 }}>
              Conectado como <strong style={{ color: c.text }}>+55 11 99999-0001</strong>
            </span>
          </div>
        )}

        {showQR && !connected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', gap: 14, borderBottom: `1px solid ${c.divider}` }}>
            <div style={{ padding: 12, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
              <QRPlaceholder />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: '0 0 4px' }}>Escaneie com o WhatsApp</p>
              <p style={{ fontSize: 12, color: c.textSec, margin: 0, lineHeight: 1.5 }}>
                Abra o WhatsApp → Menu → Aparelhos Conectados → Conectar aparelho
              </p>
            </div>
            {connecting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#128C7E' }}>
                <Spinner />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Aguardando leitura...</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, padding: '14px 16px' }}>
          <button onClick={handleConnect} className="touch-scale"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: connected ? 'rgba(220,53,69,.1)' : 'linear-gradient(135deg,#25D366,#128C7E)', border: connected ? '2px solid rgba(220,53,69,.3)' : 'none', borderRadius: 14, padding: '13px 16px', fontSize: 14, fontWeight: 700, color: connected ? '#DC3545' : '#fff', cursor: 'pointer', minHeight: 48, fontFamily: 'Inter,sans-serif' }}>
            {connected ? <><Link2Off size={17} strokeWidth={2.5} />Desconectar</> : connecting ? <><Spinner />Conectando...</> : <><Link2 size={17} strokeWidth={2.5} />Conectar via QR</>}
          </button>
          {connected && (
            <button className="touch-scale"
              style={{ width: 48, height: 48, borderRadius: 14, background: c.inputBg, border: `2px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              aria-label="Atualizar">
              <RefreshCw size={18} color={c.textSec} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </section>
  );

  /* ── Schedule card ───────────────────────────── */
  const ScheduleCard = (
    <section style={{ marginBottom: isDesktop ? 0 : 20 }}>
      <SLabel c={c}>Horário de Envio Automático</SLabel>
      <div style={{ background: c.card, borderRadius: 24, overflow: 'hidden', boxShadow: c.cardShadow, border: `1.5px solid ${c.cardBorder}`, transition: 'background 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: isDark ? 'rgba(255,193,7,.08)' : 'rgba(255,193,7,.06)', borderBottom: `1px solid ${c.divider}` }}>
          <Clock size={15} color="#FFC107" strokeWidth={2.5} />
          <p style={{ fontSize: 12, color: isDark ? 'rgba(255,193,7,.9)' : '#856404', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
            Mensagens enviadas <strong>1 dia antes</strong> da rota, no horário configurado.
          </p>
        </div>
        <TimeRow Icon={Sunrise} label="Rota Manhã"  sub="Aviso enviado na véspera" color="#FFC107" value={morning}   onChange={setMorning}   c={c} />
        {DIV}
        <TimeRow Icon={Sun}     label="Rota Tarde"  sub="Aviso enviado de manhã"   color="#FD7E14" value={afternoon} onChange={setAfternoon} c={c} />
        {DIV}
        <TimeRow Icon={Moon}    label="Rota Noite"  sub="Aviso enviado à tarde"    color="#6C5CE7" value={night}     onChange={setNight}     c={c} />
        <div style={{ padding: '12px 16px 16px' }}>
          <button onClick={saveSchedule} className="touch-scale"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: schedSaved ? '#198754' : '#FFC107', border: 'none', borderRadius: 14, padding: '13px 24px', fontSize: 14, fontWeight: 700, color: schedSaved ? '#fff' : '#212529', cursor: 'pointer', minHeight: 48, fontFamily: 'Inter,sans-serif', transition: 'background .25s' }}>
            {schedSaved ? <><CheckCircle2 size={17} strokeWidth={2.5} />Horários Salvos!</> : <><Save size={17} strokeWidth={2.5} />Salvar Horários</>}
          </button>
        </div>
      </div>
    </section>
  );

  /* ── Template card ───────────────────────────── */
  const TemplateCard = (
    <section style={{ marginBottom: isDesktop ? 0 : 20 }}>
      <SLabel c={c}>Template de Mensagem</SLabel>
      <div style={{ background: c.card, borderRadius: 24, overflow: 'hidden', boxShadow: c.cardShadow, border: `1.5px solid ${c.cardBorder}`, transition: 'background 0.3s' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.divider}`, background: isDark ? 'rgba(255,255,255,.03)' : '#F8F9FA' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: c.sectionTitle, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Variáveis disponíveis</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['[RESPONSÁVEL]', '[NOME]', '[DATA]', '[TURNO]'].map(v => (
              <span key={v} style={{ background: isDark ? 'rgba(37,211,102,.12)' : 'rgba(37,211,102,.08)', color: '#128C7E', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(37,211,102,.2)', cursor: 'pointer' }}>{v}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${c.divider}` }}>
          <MessageCircle size={14} color="#25D366" fill="#25D366" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#128C7E' }}>Editor · WhatsApp</span>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={7}
            style={{ width: '100%', background: c.inputBg, border: `2px solid ${c.inputBorder}`, borderRadius: 14, padding: '14px 16px', fontSize: 13, fontFamily: 'Inter,sans-serif', color: c.text, outline: 'none', resize: 'vertical', lineHeight: 1.6, minHeight: 140, boxSizing: 'border-box' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#25D366'; }}
            onBlur={e => { e.currentTarget.style.borderColor = c.inputBorder; }}
          />
          <p style={{ fontSize: 11, color: c.textMuted, margin: '6px 0 0' }}>{template.length} caracteres</p>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
          <button onClick={() => setTemplate(DEFAULT_TEMPLATE)} className="touch-scale"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `2px solid ${c.border}`, borderRadius: 14, padding: '12px 16px', fontSize: 13, fontWeight: 600, color: c.textSec, cursor: 'pointer', minHeight: 48, fontFamily: 'Inter,sans-serif' }}>
            <RotateCcw size={15} strokeWidth={2.5} /> Resetar
          </button>
          <button onClick={saveTemplate} className="touch-scale"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: tmplSaved ? '#198754' : 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', borderRadius: 14, padding: '12px 24px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', minHeight: 48, fontFamily: 'Inter,sans-serif', transition: 'background .25s' }}>
            {tmplSaved ? <><CheckCircle2 size={17} strokeWidth={2.5} />Salvo!</> : <><Send size={17} strokeWidth={2.5} />Salvar Template</>}
          </button>
        </div>
      </div>
    </section>
  );

  return (
    <div style={{ background: c.bg, minHeight: '100%', transition: 'background 0.3s' }}>
      {/* Header — scrolls naturally with page content */}
      <div style={{ background: 'linear-gradient(160deg,#075E54,#128C7E)', padding: `20px ${px}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Hamburger — only when sidebar is hidden */}
          {!isLg && (
            <button onClick={openDrawer} className="touch-scale"
              aria-label="Abrir menu de navegação"
              style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer' }}>
              <Menu size={20} color="#fff" strokeWidth={2} />
            </button>
          )}
          <div style={{ width: 42, height: 42, background: 'rgba(255,255,255,.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={22} color="#fff" strokeWidth={2} fill="rgba(255,255,255,.2)" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>Painel WhatsApp</h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', margin: 0 }}>Bot automático de confirmações</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: connected ? 'rgba(37,211,102,.2)' : 'rgba(220,53,69,.2)', borderRadius: 20, padding: '5px 10px' }}>
            {connected
              ? <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', display: 'inline-block' }} />
              : <WifiOff size={13} color="#DC3545" />
            }
            <span style={{ fontSize: 11, fontWeight: 700, color: connected ? '#25D366' : '#DC3545' }}>{connected ? 'Conectado' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: `20px ${px}px 32px` }}>
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            <div>{ConnectionCard}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {ScheduleCard}
              {TemplateCard}
            </div>
          </div>
        ) : (
          <>
            {ConnectionCard}
            {ScheduleCard}
            {TemplateCard}
          </>
        )}

        {/* Info card */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: isDark ? 'rgba(255,193,7,.08)' : 'rgba(255,193,7,.08)', border: '1.5px solid rgba(255,193,7,.25)', borderRadius: 16, padding: '14px 16px', marginTop: 20 }}>
          <AlertTriangle size={18} color="#FFC107" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#FFC107' : '#856404', margin: '0 0 4px' }}>Como funciona o Bot?</p>
            <p style={{ fontSize: 12, color: c.textSec, margin: 0, lineHeight: 1.6 }}>
              O SmartRoutes envia mensagens automáticas via WhatsApp Web API. Os responsáveis respondem com <strong>1</strong> (Vai) ou <strong>2</strong> (Não vai), e o app atualiza a lista de rota em tempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}