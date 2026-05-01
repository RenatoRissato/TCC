export type StudentStatus = 'going' | 'absent' | 'pending';
export type RouteType = 'morning' | 'afternoon' | 'night';

export interface Passenger {
  id: string;
  rotaId: string;
  name: string;
  initials: string;
  address: string;
  neighborhood: string;
  phone: string;
  parentName: string;
  status: StudentStatus;
  responseTime?: string;
  stopOrder: number;
  routes: RouteType[];
  grade: string;
  avatar?: string;
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

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  cnh: string | null;
  plate?: string;
  vehicle?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
}
