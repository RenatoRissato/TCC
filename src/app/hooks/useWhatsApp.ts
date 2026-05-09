import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  EstatisticasMensagens,
  obterConfiguracaoAutomacao,
  obterEstatisticasMensagens,
  obterInstancia,
  obterTemplate,
  OPCOES_PADRAO,
  salvarConfiguracaoAutomacao,
  salvarTemplate,
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
  const [horarioLimiteResp,    setHorarioLimiteResp]    = useState('');

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
    setHorarioLimiteResp((cfg?.horario_limite_resposta ?? '').slice(0, 5));
  }, []);

  const carregar = useCallback(async () => {
    if (!motoristaId) return;
    setLoading(true);
    setErro(null);
    try {
      const inst = await obterInstancia(motoristaId);
      setInstancia(inst);

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
        horarioLimiteResposta:  horarioLimiteResp  || null,
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
    horarioLimiteResp,
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
    horarioLimiteResp,
    setCabecalhoEdit,
    setRodapeEdit,
    setEnvioAutomaticoAtivo,
    setHorarioEnvioAuto,
    setHorarioLimiteResp,
    editarOpcao,

    // ações
    salvandoConfig,
    salvandoTemplate,
    verificandoConexao,
    salvarHorarios,
    salvarTemplateAtual,
    resetarTemplate,
    verificarConexao,
    recarregar: carregar,
  };
}
