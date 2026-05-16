import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { listarRotas } from '../services/rotaService';
import {
  desconectarWhatsApp,
  EstatisticasMensagens,
  obterConfiguracaoAutomacao,
  obterConfiguracoesRotasAutomacao,
  obterEstatisticasMensagens,
  obterInstancia,
  obterTemplate,
  OPCOES_PADRAO,
  registrarWebhookEvolution,
  salvarConfiguracaoAutomacao,
  salvarConfiguracoesRotasAutomacao,
  salvarTemplate,
  solicitarQrCode,
  verificarConexaoWhatsApp,
} from '../services/whatsappService';
import type {
  ConfiguracaoAutomacaoRow,
  InstanciaWhatsAppRow,
  OpcaoRespostaRow,
  RotaRow,
  TemplateMensagemRow,
} from '../types/database';

export interface OpcaoTemplateState {
  numero: number;
  texto_exibido: string;
  tipo_confirmacao: OpcaoRespostaRow['tipo_confirmacao'];
}

export interface RotaAutomacaoState {
  rotaId: string;
  nome: string;
  horarioSaida: string | null;
  turno: RotaRow['turno'];
  ativa: boolean;
  envioAutomaticoAtivo: boolean;
  horarioEnvio: string;
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

function horarioPadraoDaRota(rota: RotaRow, fallback?: string | null): string {
  return (fallback || rota.horario_saida || '07:00').slice(0, 5);
}

function montarRotasAutomacao(
  rotas: RotaRow[],
  cfg: ConfiguracaoAutomacaoRow | null,
  configsRotas: Array<{
    rota_id: string;
    envio_automatico_ativo: boolean;
    horario_envio: string;
  }>,
): RotaAutomacaoState[] {
  const porRota = new Map(configsRotas.map((c) => [c.rota_id, c]));
  const horarioLegado = (cfg?.horario_envio_automatico ?? '').slice(0, 5);
  const modoLegado = cfg?.route_mode === 'specific' ? 'specific' : 'all';
  const rotaLegadaId = cfg?.route_id ?? '';

  return rotas.map((rota) => {
    const existente = porRota.get(rota.id);
    const ativaNoLegado = modoLegado === 'all' || rota.id === rotaLegadaId;
    return {
      rotaId: rota.id,
      nome: rota.nome,
      horarioSaida: rota.horario_saida,
      turno: rota.turno,
      ativa: rota.status === 'ativa',
      envioAutomaticoAtivo: existente
        ? existente.envio_automatico_ativo
        : ativaNoLegado && rota.status === 'ativa',
      horarioEnvio: existente
        ? existente.horario_envio.slice(0, 5)
        : horarioPadraoDaRota(rota, horarioLegado),
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
  const webhookRegistradoRef = useRef<string | null>(null);

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
  const [rotasAutomacao, setRotasAutomacao] = useState<RotaRow[]>([]);
  const [rotasEnvioAuto, setRotasEnvioAuto] = useState<RotaAutomacaoState[]>([]);
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
      const configsRotasPromise = inst
        ? obterConfiguracoesRotasAutomacao(inst.id)
        : Promise.resolve([]);
      const rotasPromise = listarRotas();

      const [cfg, { template: tpl, opcoes }, stats, configsRotas, rotas] = await Promise.all([
        cfgPromise,
        tplPromise,
        statsPromise,
        configsRotasPromise,
        rotasPromise,
      ]);

      setRotasAutomacao(rotas);
      setRotasEnvioAuto(montarRotasAutomacao(rotas, cfg, configsRotas));
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

  const conectado = instancia?.status_conexao === 'conectado';

  useEffect(() => {
    if (!instancia?.id || !conectado) {
      webhookRegistradoRef.current = null;
      return;
    }
    if (webhookRegistradoRef.current === instancia.id) return;

    let cancelado = false;
    void (async () => {
      const r = await registrarWebhookEvolution();
      if (cancelado) return;

      if (r.ok) {
        webhookRegistradoRef.current = instancia.id;
        debug('registrarWebhookEvolution:auto', r);
      } else {
        console.error('Falha ao registrar webhook automaticamente:', r.erro);
        toast.error('WhatsApp conectado, mas nao foi possivel sincronizar o webhook.');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [instancia?.id, conectado]);

  const salvarHorarios = useCallback(async () => {
    if (!instancia) {
      toast.error('Instância WhatsApp não encontrada para salvar.');
      return;
    }
    if (!conectado) {
      toast.error('Conecte o WhatsApp antes de ativar o cron automatico.');
      return;
    }
    if (envioAutomaticoAtivo && rotasEnvioAuto.length === 0) {
      toast.error('Nenhuma rota encontrada para configurar.');
      return;
    }
    if (
      envioAutomaticoAtivo &&
      !rotasEnvioAuto.some((rota) => rota.envioAutomaticoAtivo)
    ) {
      toast.error('Ative pelo menos uma rota para o envio automatico.');
      return;
    }
    if (rotasEnvioAuto.some((rota) => rota.envioAutomaticoAtivo && !rota.horarioEnvio)) {
      toast.error('Informe o horario de envio das rotas ativas.');
      return;
    }
    setSalvandoConfig(true);
    try {
      const primeiroHorarioAtivo =
        rotasEnvioAuto.find((rota) => rota.envioAutomaticoAtivo)?.horarioEnvio ||
        horarioEnvioAuto ||
        null;
      const atualizado = await salvarConfiguracaoAutomacao({
        instanciaId: instancia.id,
        envioAutomaticoAtivo,
        horarioEnvioAutomatico: primeiroHorarioAtivo,
        routeMode: 'all',
        routeId: null,
      });
      const configsRotas = await salvarConfiguracoesRotasAutomacao(
        instancia.id,
        rotasEnvioAuto.map((rota) => ({
          instanciaId: instancia.id,
          rotaId: rota.rotaId,
          envioAutomaticoAtivo: rota.envioAutomaticoAtivo,
          horarioEnvio: rota.horarioEnvio,
        })),
      );
      if (atualizado && configsRotas) {
        aplicarConfigNoEditor(atualizado);
        setRotasEnvioAuto(montarRotasAutomacao(rotasAutomacao, atualizado, configsRotas));
        toast.success('Configurações de envio salvas.');
      } else {
        toast.error('Não foi possível salvar. Tente novamente.');
      }
    } finally {
      setSalvandoConfig(false);
    }
  }, [
    instancia,
    conectado,
    envioAutomaticoAtivo,
    horarioEnvioAuto,
    rotasEnvioAuto,
    rotasAutomacao,
    aplicarConfigNoEditor,
  ]);

  const editarRotaEnvioAutomatico = useCallback((
    rotaId: string,
    patch: Partial<Pick<RotaAutomacaoState, 'envioAutomaticoAtivo' | 'horarioEnvio'>>,
  ) => {
    setRotasEnvioAuto((prev) =>
      prev.map((rota) => (rota.rotaId === rotaId ? { ...rota, ...patch } : rota)),
    );
  }, []);

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
    rotasAutomacao,
    rotasEnvioAuto,
    setCabecalhoEdit,
    setRodapeEdit,
    setEnvioAutomaticoAtivo,
    setHorarioEnvioAuto,
    editarRotaEnvioAutomatico,
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


