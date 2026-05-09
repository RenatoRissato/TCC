import { supabase } from '../../lib/supabase';
import type {
  ConfiguracaoAutomacaoRow,
  InstanciaWhatsAppRow,
  OpcaoRespostaRow,
  TemplateMensagemRow,
  TipoConfirmacao,
} from '../types/database';

export interface WhatsAppEstado {
  instancia: InstanciaWhatsAppRow | null;
  configuracao: ConfiguracaoAutomacaoRow | null;
  template: TemplateMensagemRow | null;
  opcoes: OpcaoRespostaRow[];
}

export const OPCOES_PADRAO: Array<{
  numero: number;
  texto_exibido: string;
  tipo_confirmacao: TipoConfirmacao;
}> = [
  { numero: 1, texto_exibido: 'Ida e volta',   tipo_confirmacao: 'ida_e_volta' },
  { numero: 2, texto_exibido: 'Somente ida',   tipo_confirmacao: 'somente_ida' },
  { numero: 3, texto_exibido: 'Somente volta', tipo_confirmacao: 'somente_volta' },
  { numero: 4, texto_exibido: 'Não vai hoje',  tipo_confirmacao: 'nao_vai' },
];

export async function obterInstancia(motoristaId: string): Promise<InstanciaWhatsAppRow | null> {
  const { data, error } = await supabase
    .from('instancias_whatsapp')
    .select('*')
    .eq('motorista_id', motoristaId)
    .maybeSingle();
  if (error) {
    console.error('obterInstancia:', error);
    return null;
  }
  return data as InstanciaWhatsAppRow | null;
}

export async function obterConfiguracaoAutomacao(
  instanciaId: string,
): Promise<ConfiguracaoAutomacaoRow | null> {
  const { data, error } = await supabase
    .from('configuracoes_automacao')
    .select('*')
    .eq('instancia_whatsapp_id', instanciaId)
    .maybeSingle();
  if (error) {
    console.error('obterConfiguracaoAutomacao:', error);
    return null;
  }
  return data as ConfiguracaoAutomacaoRow | null;
}

export interface SalvarConfiguracaoInput {
  instanciaId: string;
  envioAutomaticoAtivo: boolean;
  horarioEnvioAutomatico: string | null;
  horarioLimiteResposta: string | null;
}

export async function salvarConfiguracaoAutomacao(
  input: SalvarConfiguracaoInput,
): Promise<ConfiguracaoAutomacaoRow | null> {
  const { data, error } = await supabase
    .from('configuracoes_automacao')
    .update({
      envio_automatico_ativo:    input.envioAutomaticoAtivo,
      horario_envio_automatico:  input.horarioEnvioAutomatico,
      horario_limite_resposta:   input.horarioLimiteResposta,
    })
    .eq('instancia_whatsapp_id', input.instanciaId)
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('salvarConfiguracaoAutomacao:', error);
    return null;
  }
  return data as ConfiguracaoAutomacaoRow | null;
}

export async function obterTemplate(
  motoristaId: string,
): Promise<{ template: TemplateMensagemRow | null; opcoes: OpcaoRespostaRow[] }> {
  const { data: template, error: tplErr } = await supabase
    .from('templates_mensagem')
    .select('*')
    .eq('motorista_id', motoristaId)
    .eq('ativo', true)
    .maybeSingle();
  if (tplErr) {
    console.error('obterTemplate (template):', tplErr);
    return { template: null, opcoes: [] };
  }
  if (!template) return { template: null, opcoes: [] };

  const { data: opcoes, error: opErr } = await supabase
    .from('opcoes_resposta')
    .select('*')
    .eq('template_id', template.id)
    .order('numero', { ascending: true });
  if (opErr) {
    console.error('obterTemplate (opcoes):', opErr);
    return { template: template as TemplateMensagemRow, opcoes: [] };
  }
  return {
    template: template as TemplateMensagemRow,
    opcoes: (opcoes ?? []) as OpcaoRespostaRow[],
  };
}

export interface SalvarTemplateInput {
  templateId: string;
  cabecalho: string;
  rodape: string;
  opcoes: Array<{ numero: number; texto_exibido: string }>;
}

export async function salvarTemplate(input: SalvarTemplateInput): Promise<boolean> {
  const { error: tplErr } = await supabase
    .from('templates_mensagem')
    .update({
      cabecalho: input.cabecalho,
      rodape: input.rodape,
    })
    .eq('id', input.templateId);
  if (tplErr) {
    console.error('salvarTemplate (template):', tplErr);
    return false;
  }

  // As 4 opções já existem (criadas em criar_dados_iniciais_motorista).
  // Atualizamos cada uma individualmente — UPDATE por numero é mais
  // seguro do que UPSERT genérico em caso de id ausente.
  for (const op of input.opcoes) {
    const { error } = await supabase
      .from('opcoes_resposta')
      .update({ texto_exibido: op.texto_exibido })
      .eq('template_id', input.templateId)
      .eq('numero', op.numero);
    if (error) {
      console.error('salvarTemplate (opcao ' + op.numero + '):', error);
      return false;
    }
  }
  return true;
}

export interface EstatisticasMensagens {
  total: number;
  enviadas: number;
  entregues: number;
  falhas: number;
  recebidas: number;
  desde: string;
}

/**
 * Estatísticas dos últimos N dias agregando a tabela `mensagens`.
 * Faz queries leves com `count: 'exact', head: true` para não trafegar dados.
 */
export async function obterEstatisticasMensagens(
  instanciaId: string,
  dias = 7,
): Promise<EstatisticasMensagens> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const base = () =>
    supabase
      .from('mensagens')
      .select('*', { count: 'exact', head: true })
      .eq('instancia_whatsapp_id', instanciaId)
      .gte('enviada_em', desde);

  const [
    { count: total },
    { count: enviadas },
    { count: entregues },
    { count: falhas },
    { count: recebidas },
  ] = await Promise.all([
    base(),
    base().eq('direcao', 'saida').eq('status_envio', 'enviada'),
    base().eq('direcao', 'saida').eq('status_envio', 'entregue'),
    base().eq('direcao', 'saida').eq('status_envio', 'falha'),
    base().eq('direcao', 'entrada'),
  ]);

  return {
    total: total ?? 0,
    enviadas: enviadas ?? 0,
    entregues: entregues ?? 0,
    falhas: falhas ?? 0,
    recebidas: recebidas ?? 0,
    desde,
  };
}

/**
 * Dispara a Edge Function `verificar-whatsapp` que consulta a Evolution API
 * e atualiza `instancias_whatsapp.status_conexao` no banco.
 */
export async function verificarConexaoWhatsApp(): Promise<{
  ok: boolean;
  instancia?: InstanciaWhatsAppRow;
  conectado?: boolean;
  evolutionDisponivel?: boolean;
  erro?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('verificar-whatsapp', {
      body: {},
    });
    if (error) {
      return { ok: false, erro: error.message };
    }
    return {
      ok: true,
      instancia: data?.instancia as InstanciaWhatsAppRow,
      conectado: !!data?.conectado,
      evolutionDisponivel: data?.evolution_disponivel !== false,
    };
  } catch (err) {
    return {
      ok: false,
      erro: err instanceof Error ? err.message : String(err),
    };
  }
}
