import type { WhatsAppUpdate } from '../types';

export type { Passenger, RouteConfig, RouteType, StudentStatus, Summary, WhatsAppUpdate } from '../types';

// ─── Recent WhatsApp Updates (mock visual — feed da home) ────────
// TODO: substituir por query real em `mensagens` quando o feed virar funcional.
export const recentUpdates: WhatsAppUpdate[] = [
  { id: '1', name: 'João Pedro Alves', initials: 'JP', status: 'going',  message: 'Bom dia! João vai sim 👍', time: 'há 2 min' },
  { id: '2', name: 'Gabriela Lima',    initials: 'GL', status: 'absent', message: 'Gabi não vai hoje, está doente 🤒', time: 'há 5 min' },
  { id: '3', name: 'Elena Souza',      initials: 'ES', status: 'going',  message: 'Ela vai! Estará na porta às 7:20 ✅', time: 'há 12 min' },
  { id: '4', name: 'Bruno Mendes',     initials: 'BM', status: 'absent', message: 'Bruno não vai, consulta médica.', time: 'há 18 min' },
  { id: '5', name: 'Ana Beatriz',      initials: 'AB', status: 'going',  message: 'Ana vai! Obrigada 🙂', time: 'há 25 min' },
];
