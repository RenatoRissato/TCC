export type StudentStatus = 'going' | 'absent' | 'pending';
export type RouteType = 'morning' | 'afternoon' | 'night';
export type TipoPassageiro = 'escola' | 'faculdade';

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
}

export interface WhatsAppUpdate {
  id: string;
  name: string;
  initials: string;
  status: 'going' | 'absent';
  message: string;
  time: string;
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
}

export interface Summary {
  going: number;
  absent: number;
  pending: number;
  total: number;
}

export type SomAlerta = 'default' | 'chime' | 'bell' | 'ding' | 'none';
export type IdiomaApp = 'pt-BR' | 'en' | 'es';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
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
