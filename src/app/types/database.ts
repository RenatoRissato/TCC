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
  placa_van: string | null;
  marca_van: string | null;
  modelo_van: string | null;
  ano_van: number | null;
  criado_em: string;
}

export type TurnoRota = 'morning' | 'afternoon' | 'night';

export interface DestinoRota {
  rotulo: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
}

export interface RotaRow {
  id: string;
  motorista_id: string;
  nome: string;
  descricao: string | null;
  horario_saida: string | null;
  ponto_saida_rua: string | null;
  ponto_saida_numero: string | null;
  ponto_saida_bairro: string | null;
  ponto_saida_cep: string | null;
  destinos: DestinoRota[];
  turno: TurnoRota;
  status: StatusRota;
  criada_em: string;
}

export type TipoPassageiro = 'escola' | 'faculdade';

export interface ObservacoesPassageiro {
  tipoPassageiro?: TipoPassageiro;
  instituicao?: string;
  serieSemestre?: string;
  curso?: string;
  nomeResponsavel?: string;
}

export interface PassageiroRow {
  id: string;
  rota_id: string;
  nome_completo: string;
  telefone_responsavel: string;
  embarque_rua: string | null;
  embarque_numero: string | null;
  embarque_bairro: string | null;
  embarque_cep: string | null;
  ponto_referencia: string | null;
  turno: string | null;
  horario_embarque: string | null;
  ordem_na_rota: number;
  observacoes: ObservacoesPassageiro | null;
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
