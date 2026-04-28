export type StatusRota = 'ativa' | 'inativa';
export type StatusPassageiro = 'ativo' | 'inativo';
export type StatusViagem = 'agendada' | 'em_andamento' | 'finalizada' | 'cancelada';
export type StatusConfirmacao = 'pendente' | 'confirmado' | 'ausente';
export type TipoConfirmacao = 'ida_e_volta' | 'somente_ida' | 'somente_volta' | 'nao_vai';
export type OrigemConfirmacao = 'whatsapp' | 'manual';
export type StatusConexao = 'conectado' | 'desconectado' | 'conectando' | 'aguardando_qr';

export interface MotoristaRow {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cnh: string | null;
  criado_em: string;
}

export interface RotaRow {
  id: string;
  motorista_id: string;
  nome: string;
  descricao: string | null;
  horario_saida: string | null;
  status: StatusRota;
  criada_em: string;
}

export interface PassageiroRow {
  id: string;
  rota_id: string;
  nome_completo: string;
  telefone_responsavel: string;
  endereco_embarque: string;
  ponto_referencia: string | null;
  turno: string | null;
  horario_embarque: string | null;
  ordem_na_rota: number;
  observacoes: string | null;
  status: StatusPassageiro;
  criado_em: string;
}

export interface ViagemRow {
  id: string;
  rota_id: string;
  data: string;
  status: StatusViagem;
  iniciada_em: string;
  finalizada_em: string | null;
}

export interface ConfirmacaoRow {
  id: string;
  viagem_id: string;
  passageiro_id: string;
  tipo_confirmacao: TipoConfirmacao | null;
  status: StatusConfirmacao;
  origem: OrigemConfirmacao | null;
  criada_em: string;
  respondida_em: string | null;
}
