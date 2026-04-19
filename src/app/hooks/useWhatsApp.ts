import { useCallback, useState } from 'react';

const DEFAULT_TEMPLATE = `Olá, [RESPONSÁVEL]! 👋

Amanhã [NOME] vai usar a van escolar?

1️⃣ SIM — vai normalmente
2️⃣ NÃO — não vai amanhã

Responda com 1 ou 2. Obrigado! 🚌`;

export { DEFAULT_TEMPLATE };

export function useWhatsApp() {
  const [connected,  setConnected]  = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showQR,     setShowQR]     = useState(false);
  const [schedSaved, setSchedSaved] = useState(false);
  const [tmplSaved,  setTmplSaved]  = useState(false);
  const [morning,    setMorning]    = useState('06:30');
  const [afternoon,  setAfternoon]  = useState('11:45');
  const [night,      setNight]      = useState('18:15');
  const [template,   setTemplate]   = useState(DEFAULT_TEMPLATE);

  const connect = useCallback(async () => {
    setConnecting(true);
    setShowQR(true);
    await new Promise(r => setTimeout(r, 2200));
    setConnecting(false);
    setConnected(true);
    setShowQR(false);
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setShowQR(false);
  }, []);

  const toggleConnection = useCallback(() => {
    if (connected) disconnect();
    else connect();
  }, [connected, connect, disconnect]);

  const saveSchedule = useCallback(async () => {
    await new Promise(r => setTimeout(r, 500));
    setSchedSaved(true);
    setTimeout(() => setSchedSaved(false), 2000);
  }, []);

  const saveTemplate = useCallback(async () => {
    await new Promise(r => setTimeout(r, 500));
    setTmplSaved(true);
    setTimeout(() => setTmplSaved(false), 2000);
  }, []);

  const resetTemplate = useCallback(() => setTemplate(DEFAULT_TEMPLATE), []);

  return {
    connected, connecting, showQR,
    schedSaved, tmplSaved,
    morning, afternoon, night, template,
    setMorning, setAfternoon, setNight, setTemplate,
    connect, disconnect, toggleConnection,
    saveSchedule, saveTemplate, resetTemplate,
  };
}
