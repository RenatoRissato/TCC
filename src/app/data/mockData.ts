import type { Passenger, RouteConfig, WhatsAppUpdate } from '../types';

export type { Passenger, RouteConfig, RouteType, StudentStatus, Summary, WhatsAppUpdate } from '../types';

// ─── Passengers ──────────────────────────────────────────────────
export const passengers: Passenger[] = [
  {
    id: 1, name: 'Ana Beatriz Santos', initials: 'AB',
    address: 'Rua das Flores, 123', neighborhood: 'Jardim América',
    phone: '5511999990001', parentName: 'Maria Santos',
    status: 'going', responseTime: '06:42', stopOrder: 1,
    routes: ['morning', 'afternoon'], grade: '4º Ano'
  },
  {
    id: 2, name: 'Bruno Mendes Costa', initials: 'BM',
    address: 'Av. das Palmeiras, 456', neighborhood: 'Vila Nova',
    phone: '5511999990002', parentName: 'João Mendes',
    status: 'absent', responseTime: '06:55', stopOrder: 2,
    routes: ['morning'], grade: '3º Ano'
  },
  {
    id: 3, name: 'Carla Rodrigues Neves', initials: 'CR',
    address: 'Rua do Ipê, 789', neighborhood: 'Centro',
    phone: '5511999990003', parentName: 'Paula Rodrigues',
    status: 'going', responseTime: '07:01', stopOrder: 3,
    routes: ['morning', 'afternoon'], grade: '5º Ano'
  },
  {
    id: 4, name: 'Diego Ferreira Lima', initials: 'DF',
    address: 'Rua Marechal Deodoro, 321', neighborhood: 'Boa Vista',
    phone: '5511999990004', parentName: 'Roberto Ferreira',
    status: 'pending', stopOrder: 4,
    routes: ['afternoon', 'night'], grade: 'Engenharia'
  },
  {
    id: 5, name: 'Elena Souza Pires', initials: 'ES',
    address: 'Rua das Acácias, 654', neighborhood: 'Jardim Europa',
    phone: '5511999990005', parentName: 'Sandra Souza',
    status: 'going', responseTime: '07:05', stopOrder: 5,
    routes: ['morning', 'afternoon'], grade: '1º Ano'
  },
  {
    id: 6, name: 'Felipe Augusto Oliveira', initials: 'FO',
    address: 'Av. Brigadeiro Faria Lima, 987', neighborhood: 'Moema',
    phone: '5511999990006', parentName: 'Cláudia Oliveira',
    status: 'going', responseTime: '06:30', stopOrder: 6,
    routes: ['morning'], grade: '6º Ano'
  },
  {
    id: 7, name: 'Gabriela Lima Torres', initials: 'GL',
    address: 'Rua Tupi, 147', neighborhood: 'Alto da Boa Vista',
    phone: '5511999990007', parentName: 'Fernanda Lima',
    status: 'absent', responseTime: '06:58', stopOrder: 7,
    routes: ['morning', 'afternoon'], grade: '3º Ano'
  },
  {
    id: 8, name: 'Hugo Nascimento', initials: 'HN',
    address: 'Rua Guaratinga, 258', neighborhood: 'Vila Olímpia',
    phone: '5511999990008', parentName: 'Marcos Nascimento',
    status: 'going', responseTime: '07:10', stopOrder: 8,
    routes: ['afternoon', 'night'], grade: 'Direito'
  },
  {
    id: 9, name: 'Isabella Torres Mendes', initials: 'IT',
    address: 'Rua Frei Caneca, 369', neighborhood: 'Consolação',
    phone: '5511999990009', parentName: 'Débora Torres',
    status: 'pending', stopOrder: 9,
    routes: ['morning', 'afternoon'], grade: '2º Ano'
  },
  {
    id: 10, name: 'João Pedro Alves', initials: 'JP',
    address: 'Rua Augusta, 741', neighborhood: 'Cerqueira César',
    phone: '5511999990010', parentName: 'Patrícia Alves',
    status: 'going', responseTime: '06:48', stopOrder: 10,
    routes: ['morning', 'night'], grade: 'Medicina'
  },
  {
    id: 11, name: 'Larissa Campos', initials: 'LC',
    address: 'Rua Peixoto Gomide, 501', neighborhood: 'Jardins',
    phone: '5511999990011', parentName: 'Eduardo Campos',
    status: 'absent', responseTime: '07:15', stopOrder: 11,
    routes: ['night'], grade: 'Administração'
  },
  {
    id: 12, name: 'Mateus Ribeiro', initials: 'MR',
    address: 'Al. Santos, 1200', neighborhood: 'Cerqueira César',
    phone: '5511999990012', parentName: 'Silvana Ribeiro',
    status: 'pending', stopOrder: 12,
    routes: ['afternoon', 'night'], grade: 'Arquitetura'
  },
];

// ─── Recent WhatsApp Updates ─────────────────────────────────────
export const recentUpdates: WhatsAppUpdate[] = [
  { id: 1, name: 'João Pedro Alves', initials: 'JP', status: 'going',  message: 'Bom dia! João vai sim 👍', time: 'há 2 min' },
  { id: 2, name: 'Gabriela Lima',    initials: 'GL', status: 'absent', message: 'Gabi não vai hoje, está doente 🤒', time: 'há 5 min' },
  { id: 3, name: 'Elena Souza',      initials: 'ES', status: 'going',  message: 'Ela vai! Estará na porta às 7:20 ✅', time: 'há 12 min' },
  { id: 4, name: 'Bruno Mendes',     initials: 'BM', status: 'absent', message: 'Bruno não vai, consulta médica.', time: 'há 18 min' },
  { id: 5, name: 'Ana Beatriz',      initials: 'AB', status: 'going',  message: 'Ana vai! Obrigada 🙂', time: 'há 25 min' },
];

// ─── Route Configs ────────────────────────────────────────────────
export const routeConfigs: RouteConfig[] = [
  {
    type: 'morning',
    label: 'Rota Manhã',
    time: 'Saída: 07:15',
    emoji: '☀️',
    passengerCount: passengers.filter(p => p.routes.includes('morning')).length,
    color: '#FFC107',
    darkBg: false,
  },
  {
    type: 'afternoon',
    label: 'Rota Tarde',
    time: 'Saída: 12:30',
    emoji: '🌤️',
    passengerCount: passengers.filter(p => p.routes.includes('afternoon')).length,
    color: '#FD7E14',
    darkBg: false,
  },
  {
    type: 'night',
    label: 'Rota Noite',
    time: 'Saída: 19:00',
    emoji: '🌙',
    passengerCount: passengers.filter(p => p.routes.includes('night')).length,
    color: '#6C5CE7',
    darkBg: true,
  },
];

// ─── Summary Totals ───────────────────────────────────────────────
export function getSummary(list = passengers) {
  return {
    going:   list.filter(p => p.status === 'going').length,
    absent:  list.filter(p => p.status === 'absent').length,
    pending: list.filter(p => p.status === 'pending').length,
    total:   list.length,
  };
}
