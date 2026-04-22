import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { FormInput } from '../shared/FormInput';

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="bg-transparent border-0 cursor-pointer flex items-center p-1 text-ink-muted"
      aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

export function PasswordSection() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  const handleSave = async () => {
    setErr('');
    if (!cur) return setErr('Insira a senha atual.');
    if (next.length < 6) return setErr('Nova senha: mínimo 6 caracteres.');
    if (next !== conf) return setErr('As senhas não coincidem.');
    await new Promise((r) => setTimeout(r, 700));
    setOk(true);
    setCur(''); setNext(''); setConf('');
    setTimeout(() => setOk(false), 2500);
  };

  const clearErr = (setter: (v: string) => void) => (v: string) => { setter(v); setErr(''); };

  return (
    <>
      {ok && (
        <div className="slide-up flex items-center gap-2.5 bg-success/10 border-[1.5px] border-success/30 rounded-xl px-3.5 py-3 mb-4">
          <CheckCircle2 size={18} className="text-success" strokeWidth={2.5} />
          <p className="text-[13px] font-semibold text-success m-0">Senha alterada com sucesso!</p>
        </div>
      )}
      {err && (
        <div className="slide-up flex items-center gap-2.5 bg-danger/10 border-[1.5px] border-danger/30 rounded-xl px-3.5 py-3 mb-4">
          <AlertCircle size={18} className="text-danger" strokeWidth={2.5} />
          <p className="text-[13px] font-semibold text-danger m-0">{err}</p>
        </div>
      )}

      <FormInput
        label="Senha Atual" icon={Lock}
        type={showCur ? 'text' : 'password'}
        value={cur} onChange={clearErr(setCur)}
        placeholder="••••••••"
        rightEl={<EyeToggle show={showCur} onToggle={() => setShowCur((v) => !v)} />}
      />
      <FormInput
        label="Nova Senha" icon={Lock}
        type={showNew ? 'text' : 'password'}
        value={next} onChange={clearErr(setNext)}
        placeholder="Mínimo 6 caracteres"
        rightEl={<EyeToggle show={showNew} onToggle={() => setShowNew((v) => !v)} />}
      />
      <FormInput
        label="Confirmar Nova Senha" icon={Lock}
        type="password"
        value={conf} onChange={clearErr(setConf)}
        placeholder="Repita a nova senha"
      />
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 border-0 rounded-[14px] py-3.5 px-6 text-[15px] font-bold text-white cursor-pointer min-h-[52px] font-sans bg-[linear-gradient(135deg,#DC3545,#B02A37)] shadow-[0_4px_16px_rgba(220,53,69,0.3)]"
      >
        <Lock size={18} strokeWidth={2.5} /> Salvar Nova Senha
      </button>
    </>
  );
}
