import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  desconectarWhatsApp,
  EstatisticasMensagens,
  obterConfiguracaoAutomacao,
  obterEstatisticasMensagens,
  obterInstancia,
  obterTemplate,
  OPCOES_PADRAO,
  salvarConfiguracaoAutomacao,
  salvarTemplate,
  solicitarQrCode,
  verificarConexaoWhatsApp,
} from '../services/whatsappService';
import type {
  ConfiguracaoAutomacaoRow,
  InstanciaWhatsAppRow,
  OpcaoRespostaRow,
  TemplateMensagemRow,
} from '../types/database';

export interface OpcaoTemplateState {
  numero: number;
  texto_exibido: string;
  tipo_confirmacao: OpcaoRespostaRow['tipo_confirmacao'];
}

// Liga/desliga logs de depuração via localStorage. Útil para o usuário
// inspecionar o fluxo de QR no DevTools sem rebuild — basta rodar:
//   localStorage.setItem('debug:whatsapp', '1')
function debug(rotulo: string, payload?: unknown) {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('debug:whatsapp')) {
      // eslint-disable-next-line no-console
      console.debug(`[useWhatsApp] ${rotulo}`, payload);
    }
  } catch {
    // localStorage indisponível — segue silencioso
  }
}

function ordenarOpcoesNaUI(opcoes: OpcaoRespostaRow[]): OpcaoTemplateState[] {
  // Garante que sempre teremos as 4 opções na UI, mesmo que alguma esteja
  // ausente no banco. Banco é fonte da verdade quando existe; default cobre lacunas.
  return OPCOES_PADRAO.map((padrao) => {
    const existente = opcoes.find((o) => o.numero === padrao.numero);
    return {
      numero: padrao.numero,
      texto_exibido: existente?.texto_exibido ?? padrao.texto_exibido,
      tipo_confirmacao: padrao.tipo_confirmacao,
    };
  });
}

export function useWhatsApp() {
  const { motoristaId } = useAuth();

  const [loading,   setLoading]   = useState(false);
  const [erro,      setErro]      = useState<string | null>(null);
  const [verificandoConexao, setVerificandoConexao] = useState(false);
  const [salvandoConfig,  setSalvandoConfig]  = useState(false);
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  // Estado do fluxo de QR Code
  const [qrAberto, setQrAberto] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [solicitandoQr, setSolicitandoQr] = useState(false);
  const [expirandoEm, setExpirandoEm] = useState<number>(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiraTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<number>(0);

  const [instancia,    setInstancia]    = useState<InstanciaWhatsAppRow | null>(null);
  const [configuracao, setConfiguracao] = useState<ConfiguracaoAutomacaoRow | null>(null);
  const [template,     setTemplate]     = useState<TemplateMensagemRow | null>(null);

  // Estado editável da UI — separado do que está no banco para permitir
  // edições antes de salvar.
  const [cabecalhoEdit, setCabecalhoEdit] = useState('');
  const [rodapeEdit,    setRodapeEdit]    = useState('');
  const [opcoesEdit,    setOpcoesEdit]    = useState<OpcaoTemplateState[]>(ordenarOpcoesNaUI([]));

  const [envioAutomaticoAtivo, setEnvioAutomaticoAtivo] = useState(false);
  const [horarioEnvioAuto,     setHorarioEnvioAuto]     = useState('');
  const [estatisticas, setEstatisticas] = useState<EstatisticasMensagens | null>(null);

  // Hidrata o estado editável a partir dos dados do banco.
  const aplicarTemplateNoEditor = useCallback(
    (tpl: TemplateMensagemRow | null, ops: OpcaoRespostaRow[]) => {
      setTemplate(tpl);
      setCabecalhoEdit(tpl?.cabecalho ?? '');
      setRodapeEdit(tpl?.rodape ?? '');
      setOpcoesEdit(ordenarOpcoesNaUI(ops));
    },
    [],
  );

  const aplicarConfigNoEditor = useCallback((cfg: ConfiguracaoAutomacaoRow | null) => {
    setConfiguracao(cfg);
    setEnvioAutomaticoAtivo(!!cfg?.envio_automatico_ativo);
    setHorarioEnvioAuto((cfg?.horario_envio_automatico ?? '').slice(0, 5));
  }, []);

  const carregar = useCallback(async () => {
    if (!motoristaId) return;
    setLoading(true);
    setErro(null);
    try {
      const statusAtual = await verificarConexaoWhatsApp();
      debug('carregar:verificarConexaoWhatsApp', statusAtual);

      const inst = statusAtual.ok && statusAtual.instancia
        ? statusAtual.instancia
        : await obterInstancia(motoristaId);

      // Anti-race: se já tínhamos uma instância na memória mais "recente"
      // (criada/atualizada depois do que veio aqui), preserva ela. Isso
      // protege contra `verificar-whatsapp` chegando depois do polling do
      // QR ou do webhook ter atualizado o estado para 'conectado'.
      setInstancia((prev) => {
        if (!inst) return prev ?? null;
        if (!prev) return inst;
        // Não regride 'conectado' → 'desconectado' por carregar tardio se
        // o retorno do servidor não confirma desconexão real.
        const prevTs = prev.data_ultima_conexao
          ? Date.parse(prev.data_ultima_conexao)
          : 0;
        const newTs = inst.data_ultima_conexao
          ? Date.parse(inst.data_ultima_conexao)
          : 0;
        if (
          prev.status_conexao === 'conectado' &&
          inst.status_conexao !== 'conectado' &&
          prevTs >= newTs
        ) {
          debug('carregar:preservando_instancia_anterior', { prev, inst });
          return prev;
        }
        return inst;
      });

      const cfgPromise = inst
        ? obterConfiguracaoAutomacao(inst.id)
        : Promise.resolve(null);
      const tplPromise = obterTemplate(motoristaId);
      const statsPromise = inst
        ? obterEstatisticasMensagens(inst.id, 7)
        : Promise.resolve(null);

      const [cfg, { template: tpl, opcoes }, stats] = await Promise.all([
        cfgPromise,
        tplPromise,
        statsPromise,
      ]);

      aplicarConfigNoEditor(cfg);
      aplicarTemplateNoEditor(tpl, opcoes);
      setEstatisticas(stats);
    } catch (err) {
      console.error('useWhatsApp.carregar:', err);
      setErro(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [motoristaId, aplicarConfigNoEditor, aplicarTemplateNoEditor]);

  useEffect(() => {
    if (!motoristaId) return;
    void carregar();
  }, [motoristaId, carregar]);

  const verificarConexao = useCallback(async () => {
    if (!motoristaId || verificandoConexao) return;
    setVerificandoConexao(true);
    try {
      const r = await verificarConexaoWhatsApp();
      debug('verificarConexao', r);
      if (r.ok && r.instancia) {
        setInstancia(r.instancia);
        if (r.conectado) {
          toast.success('WhatsApp conectado.');
        } else if (r.evolutionDisponivel === false) {
          toast.error('Evolution API indisponível. Verifique os secrets do Supabase.');
        } else {
          toast('WhatsApp desconectado.', {
            description: 'Escaneie o QR Code na próxima fase para reconectar.',
          });
        }
      } else {
        toast.error('Não foi possível verificar a conexão.', {
          description: r.erro,
        });
      }
    } finally {
      setVerificandoConexao(false);
    }
  }, [motoristaId, verificandoConexao]);

  const salvarHorarios = useCallback(async () => {
    if (!instancia) {
      toast.error('Instância WhatsApp não encontrada para salvar.');
      return;
    }
    setSalvandoConfig(true);
    try {
      const atualizado = await salvarConfiguracaoAutomacao({
        instanciaId: instancia.id,
        envioAutomaticoAtivo,
        horarioEnvioAutomatico: horarioEnvioAuto || null,
      });
      if (atualizado) {
        aplicarConfigNoEditor(atualizado);
        toast.success('Configurações de envio salvas.');
      } else {
        toast.error('Não foi possível salvar. Tente novamente.');
      }
    } finally {
      setSalvandoConfig(false);
    }
  }, [
    instancia,
    envioAutomaticoAtivo,
    horarioEnvioAuto,
    aplicarConfigNoEditor,
  ]);

  const salvarTemplateAtual = useCallback(async () => {
    if (!template) {
      toast.error('Template não encontrado.');
      return;
    }
    if (!cabecalhoEdit.trim() || !rodapeEdit.trim()) {
      toast.error('Cabeçalho e rodapé não podem ficar vazios.');
      return;
    }
    if (opcoesEdit.some((o) => !o.texto_exibido.trim())) {
      toast.error('Todas as 4 opções precisam de texto.');
      return;
    }
    setSalvandoTemplate(true);
    try {
      const ok = await salvarTemplate({
        templateId: template.id,
        cabecalho: cabecalhoEdit.trim(),
        rodape: rodapeEdit.trim(),
        opcoes: opcoesEdit.map((o) => ({
          numero: o.numero,
          texto_exibido: o.texto_exibido.trim(),
        })),
      });
      if (ok) {
        const { template: tpl, opcoes } = await obterTemplate(template.motorista_id);
        aplicarTemplateNoEditor(tpl, opcoes);
        toast.success('Template salvo com sucesso.');
      } else {
        toast.error('Não foi possível salvar o template.');
      }
    } finally {
      setSalvandoTemplate(false);
    }
  }, [template, cabecalhoEdit, rodapeEdit, opcoesEdit, aplicarTemplateNoEditor]);

  const resetarTemplate = useCallback(() => {
    if (!template) return;
    setCabecalhoEdit(template.cabecalho);
    setRodapeEdit(template.rodape);
    // Volta as opções para o que está no banco (recarrega leve).
    void obterTemplate(template.motorista_id).then(({ opcoes }) => {
      setOpcoesEdit(ordenarOpcoesNaUI(opcoes));
    });
  }, [template]);

  const editarOpcao = useCallback((numero: number, texto: string) => {
    setOpcoesEdit((prev) =>
      prev.map((o) => (o.numero === numero ? { ...o, texto_exibido: texto } : o)),
    );
  }, []);

  const conectado = instancia?.status_conexao === 'conectado';

  // ---- Fluxo de QR Code ----
  // Importante: polling e contagem regressiva são timers SEPARADOS.
  // Iniciar o polling não pode parar a contagem (essa foi a causa de o
  // contador ficar travado em 60s — `iniciarPolling` chamava `pararPolling`
  // logo após `iniciarContagemRegressiva` ter ligado o timer de expiração).
  const pararPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pararContagemRegressiva = useCallback(() => {
    if (expiraTimerRef.current) {
      clearInterval(expiraTimerRef.current);
      expiraTimerRef.current = null;
    }
  }, []);

  const pararTudoQr = useCallback(() => {
    pararPolling();
    pararContagemRegressiva();
  }, [pararPolling, pararContagemRegressiva]);

  const fecharQr = useCallback(() => {
    pararTudoQr();
    setQrAberto(false);
    setQrCode(null);
    setPairingCode(null);
    setExpirandoEm(0);
  }, [pararTudoQr]);

  const consultarStatusQr = useCallback(async () => {
    const r = await verificarConexaoWhatsApp();
    debug('consultarStatusQr', r);
    if (r.ok && r.instancia) {
      setInstancia(r.instancia);
      if (r.conectado) {
        pararTudoQr();
        setQrAberto(false);
        setQrCode(null);
        setPairingCode(null);
        setExpirandoEm(0);
        toast.success('WhatsApp conectado.', {
          description: r.instancia.numero_conta
            ? `Conta vinculada: ${r.instancia.numero_conta}`
            : undefined,
        });
        return true;
      }
    }
    return false;
  }, [pararTudoQr]);

  // Polling: a cada 3s consulta status-whatsapp; encerra ao conectar
  // ou quando o deadline (90s a partir de abrirConexao) expirar.
  const iniciarPolling = useCallback(() => {
    pararPolling();
    pollDeadlineRef.current = Date.now() + 90_000;
    void consultarStatusQr();
    pollIntervalRef.current = setInterval(async () => {
      if (Date.now() > pollDeadlineRef.current) {
        pararPolling();
        return;
      }
      await consultarStatusQr();
    }, 3000);
  }, [pararPolling, consultarStatusQr]);

  const iniciarContagemRegressiva = useCallback((segundos: number) => {
    if (expiraTimerRef.current) clearInterval(expiraTimerRef.current);
    setExpirandoEm(segundos);
    const fim = Date.now() + segundos * 1000;
    expiraTimerRef.current = setInterval(() => {
      const restante = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
      setExpirandoEm(restante);
      if (restante <= 0 && expiraTimerRef.current) {
        clearInterval(expiraTimerRef.current);
        expiraTimerRef.current = null;
      }
    }, 500);
  }, []);

  const abrirConexao = useCallback(async () => {
    if (solicitandoQr) return;
    setSolicitandoQr(true);
    setQrAberto(true);
    const r = await solicitarQrCode();
    debug('abrirConexao:solicitarQrCode', r);
    setSolicitandoQr(false);
    if (r.ok && (r.jaConectado || r.conectado) && r.instancia) {
      setInstancia(r.instancia);
      setQrAberto(false);
      setQrCode(null);
      setPairingCode(null);
      setExpirandoEm(0);
      toast.success('WhatsApp ja esta conectado.', {
        description: r.instancia.numero_conta
          ? `Conta vinculada: ${r.instancia.numero_conta}`
          : undefined,
      });
      return;
    }
    if (!r.ok || (!r.qr && !r.pairingCode)) {
      const conectadoAgora = await consultarStatusQr();
      if (conectadoAgora) return;
      toast.error('Não foi possível gerar o QR Code.', { description: r.erro });
      setQrAberto(false);
      return;
    }
    if (r.instancia) setInstancia(r.instancia);
    setQrCode(r.qr ?? null);
    setPairingCode(r.pairingCode ?? null);
    iniciarContagemRegressiva(r.expiraEmSegundos ?? 60);
    iniciarPolling();
  }, [solicitandoQr, consultarStatusQr, iniciarContagemRegressiva, iniciarPolling]);

  const gerarNovoQr = useCallback(async () => {
    if (solicitandoQr) return;
    setSolicitandoQr(true);
    const r = await solicitarQrCode();
    debug('gerarNovoQr:solicitarQrCode', r);
    setSolicitandoQr(false);
    if (r.ok && (r.jaConectado || r.conectado) && r.instancia) {
      setInstancia(r.instancia);
      fecharQr();
      toast.success('WhatsApp ja esta conectado.', {
        description: r.instancia.numero_conta
          ? `Conta vinculada: ${r.instancia.numero_conta}`
          : undefined,
      });
      return;
    }
    if (!r.ok || (!r.qr && !r.pairingCode)) {
      const conectadoAgora = await consultarStatusQr();
      if (conectadoAgora) return;
      toast.error('Falha ao gerar novo QR.', { description: r.erro });
      return;
    }
    if (r.instancia) setInstancia(r.instancia);
    setQrCode(r.qr ?? null);
    setPairingCode(r.pairingCode ?? null);
    iniciarContagemRegressiva(r.expiraEmSegundos ?? 60);
    if (!pollIntervalRef.current) iniciarPolling();
  }, [solicitandoQr, consultarStatusQr, iniciarContagemRegressiva, iniciarPolling, fecharQr]);

  const desconectarConexao = useCallback(async () => {
    if (desconectando) return;
    setDesconectando(true);
    const r = await desconectarWhatsApp();
    debug('desconectarConexao', r);
    setDesconectando(false);

    if (!r.ok) {
      toast.error('Não foi possível desconectar o WhatsApp.', {
        description: r.erro,
      });
      return;
    }

    if (r.instancia) setInstancia(r.instancia);
    fecharQr();

    // Aviso vem quando a Evolution recusou o logout mas a sessão local foi
    // marcada como desconectada mesmo assim. Mostra como info, não erro.
    if (r.aviso) {
      toast('WhatsApp desconectado localmente.', {
        description: 'A Evolution não respondeu o logout — reconecte para sincronizar.',
      });
    } else {
      toast.success('WhatsApp desconectado.');
    }
  }, [desconectando, fecharQr]);

  // Cleanup de timers ao desmontar
  useEffect(() => {
    return () => pararTudoQr();
  }, [pararTudoQr]);

  return {
    // estado base
    loading,
    erro,
    instancia,
    configuracao,
    template,
    estatisticas,
    conectado,

    // editores
    cabecalhoEdit,
    rodapeEdit,
    opcoesEdit,
    envioAutomaticoAtivo,
    horarioEnvioAuto,
    setCabecalhoEdit,
    setRodapeEdit,
    setEnvioAutomaticoAtivo,
    setHorarioEnvioAuto,
    editarOpcao,

    // ações
    salvandoConfig,
    salvandoTemplate,
    verificandoConexao,
    desconectando,
    salvarHorarios,
    salvarTemplateAtual,
    resetarTemplate,
    verificarConexao,
    desconectarConexao,
    recarregar: carregar,

    // QR Code
    qrAberto,
    qrCode,
    pairingCode,
    solicitandoQr,
    expirandoEm,
    abrirConexao,
    gerarNovoQr,
    fecharQr,
  };
}
