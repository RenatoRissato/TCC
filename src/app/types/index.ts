export type StudentStatus = 'going' | 'absent' | 'pending';
export type RouteType = 'morning' | 'afternoon' | 'night';
export type TipoPassageiro = 'escola' | 'faculdade';

// Tipo detalhado de confirmação (espelha o enum `tipo_confirmacao` do banco).
// Usado pela UI para mostrar badges diferenciadas (ida e volta / só ida / só
// volta / não vai) além do `status` agregado do app.
export type TipoConfirmacaoUI = 'ida_e_volta' | 'somente_ida' | 'somente_volta' | 'nao_vai';

export interface Passenger {
  id: string;
  rotaId: string;
  name: string;
  initials: string;
  address: string;
  addressRua: string;
  addressNumero: string;
  addressBairro: string;
  addressCep: string;
  phone: string;
  parentName: string;
  status: StudentStatus;
  responseTime?: string;
  stopOrder: number;
  routes: RouteType[];
  grade: string;
  avatar?: string;
  // Campos estruturados — vêm do JSONB observacoes
  tipoPassageiro: TipoPassageiro;
  instituicao: string;
  serieSemestre: string;
  curso: string;
  // Confirmação do dia (se houver) — usado pelo botão "Reenviar" para chamar
  // a Edge Function reenviar-confirmacao. null quando não há viagem hoje.
  confirmacaoId?: string | null;
  // Tipo detalhado da resposta do responsável. null quando ainda não respondeu
  // (status='pending') ou quando o sistema marcou ausente sem tipo.
  tipoConfirmacao?: TipoConfirmacaoUI | null;
}

export interface WhatsAppUpdate {
  id: string;
  name: string;
  initials: string;
  status: 'going' | 'absent';
  message: string;
  time: string;
  /** Tipo detalhado da resposta — opcional, usado para badges coloridas. */
  tipoConfirmacao?: TipoConfirmacaoUI | null;
}

export interface RouteConfig {
  type: RouteType;
  rotaId?: string;
  label: string;
  time: string;
  emoji: string;
  passengerCount: number;
  color: string;
  darkBg: boolean;
  pontoSaida?: string | null;
  /** True quando a rota tem ao menos um destino final cadastrado. */
  temDestinoFinal?: boolean;
}

export interface Summary {
  going: number;
  absent: number;
  pending: number;
  total: number;
  /**
   * Quebra detalhada do total — soma com `absent` = não vai, soma das 3
   * primeiras com `going`. Opcional para não quebrar consumidores antigos
   * que só leem o agregado.
   */
  detalhado?: {
    ida_e_volta: number;
    somente_ida: number;
    somente_volta: number;
    nao_vai: number;
    pendente: number;
  };
}

export type SomAlerta = 'default' | 'chime' | 'bell' | 'ding' | 'none';
export type IdiomaApp = 'pt-BR' | 'en' | 'es';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  cnh: string | null;
  plate?: string;
  vehicle?: string;
  // Veículo desnormalizado (para o ProfileEditModal editar peça por peça)
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  // Preferências persistidas em motoristas (migration 20260509)
  notifWhatsApp?: boolean;
  notifPush?: boolean;
  notifPendentes?: boolean;
  somAlerta?: SomAlerta;
  idioma?: IdiomaApp;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  plate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number | null;
}
