export type StudentStatus = 'going' | 'absent' | 'pending';
export type RouteType = 'morning' | 'afternoon' | 'night';

export interface Passenger {
  id: number;
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
  id: number;
  name: string;
  initials: string;
  status: 'going' | 'absent';
  message: string;
  time: string;
}

export interface RouteConfig {
  type: RouteType;
  label: string;
  time: string;
  emoji: string;
  passengerCount: number;
  color: string;
  darkBg: boolean;
}

export interface Summary {
  going: number;
  absent: number;
  pending: number;
  total: number;
}

export interface User {
  name: string;
  email: string;
  phone: string;
  plate: string;
  vehicle: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
}
