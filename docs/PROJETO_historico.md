# SmartRoutes PWA — Documento de Escopo & História do Projeto

---

## O que é o SmartRoutes?

O **SmartRoutes** é um PWA (Progressive Web App) mobile-first desenvolvido para **motoristas de vans escolares**. O problema que ele resolve é simples e real: todo dia, o motorista precisa saber quais alunos vão ou não vão na van — e isso geralmente é feito por ligações, mensagens manuais no WhatsApp ou planilhas. O SmartRoutes automatiza esse processo com um **bot de WhatsApp** que envia perguntas automáticas para os responsáveis e consolida as respostas em um dashboard visual e intuitivo.

O produto é 100% **frontend**, sem backend real — todos os dados são mockados para simulação e demonstração. É uma plataforma SaaS proposta para o segmento escolar brasileiro, com suporte completo a **dark mode**, **responsividade total** (mobile, tablet e desktop) e identidade visual própria baseada em amarelo (#FFC107) como cor primária.

---

## A Stack Tecnológica

### Core
| Tecnologia | Versão | Papel |
|---|---|---|
| **React** | 18.3.1 | Engine da interface |
| **TypeScript** | via Vite | Tipagem estática em todo o projeto |
| **Vite** | 6.4.2 | Build tool e dev server ultrarrápido |
| **React Router** | 7.13 | Navegação entre telas (SPA) |

### Estilo & Design System
| Tecnologia | Versão | Papel |
|---|---|---|
| **Tailwind CSS** | v4.1.12 | Classes utilitárias de estilo (config via `@theme inline`) |
| **Shadcn/ui** | — | Biblioteca de componentes prontos e acessíveis |
| **Radix UI** | vários | Primitivos de UI (accordions, modais, switches, tabs…) |
| **Lucide React** | 0.487 | Ícones SVG em toda a interface |

### Funcionalidades Específicas
| Biblioteca | Para quê serve |
|---|---|
| **Recharts** | Gráficos (donut e barras semanais) |
| **React Hook Form** | Formulários |
| **Sonner** | Toasts/notificações (via wrapper Shadcn `ui/sonner.tsx`) |
| **Vaul** | Bottom sheets/drawers (via wrapper Shadcn `ui/drawer.tsx`) |

### Testes
| Tecnologia | Versão | Papel |
|---|---|---|
| **Vitest** | ^4.1.4 | Test runner compatível com Vite |
| **@testing-library/react** | ^16.3.2 | Renderização de componentes em testes |
| **@testing-library/jest-dom** | ^6.9.1 | Matchers semânticos (toBeInTheDocument, etc.) |
| **jsdom** | ^29.0.2 | DOM virtual para ambiente de testes |

---

## Arquitetura Geral

```
src/
├── main.tsx                 → Entry point React
├── styles/
│   ├── index.css            → Reset global + body overflow rules
│   ├── fonts.css            → Google Fonts: Inter
│   ├── theme.css            → Tokens de cor (light/dark), radius, charts
│   └── tailwind.css         → Config Tailwind v4
├── test/
│   ├── setup.ts             → Configura @testing-library/jest-dom globalmente
│   ├── passengerService.test.ts → Testes unitários do serviço de passageiros
│   └── StatusBadge.test.tsx → Testes de componente do StatusBadge
└── app/
    ├── App.tsx              → Root: AuthProvider > ThemeProvider > AuthGate
    ├── routes.tsx           → Rotas protegidas (AppLayout + 4 telas)
    ├── types/index.ts       → Tipos centralizados (Passenger, User, etc.)
    ├── data/mockData.ts     → 12 passageiros + rotas + atualizações mockados
    ├── services/            → Camada de acesso aos dados (encapsula mockData)
    │   ├── passengerService.ts → getPassengers(), getSummary()
    │   ├── dashboardService.ts → getRecentUpdates(), getRouteConfigs()
    │   └── index.ts         → Re-exporta tudo de services/
    ├── context/             → Estado global (Auth, Theme, NavDrawer)
    ├── hooks/               → Lógica reutilizável (Passengers, WhatsApp, etc.)
    ├── screens/             → As 6 telas da aplicação
    └── components/          → Componentes organizados por domínio
```

### Fluxo de Autenticação

```
App.tsx
└── AuthGate
    ├── NÃO autenticado → LoginScreen ↔ RegisterScreen
    └── Autenticado → RouterProvider
                       └── AppLayout (SideNav + BottomNav)
                           ├── /home    → DashboardScreen
                           ├── /routes  → RouteScreen
                           ├── /whatsapp→ WhatsAppScreen
                           └── /settings→ SettingsScreen
```

---

## As Telas

### 1. LoginScreen — Porta de Entrada
A primeira impressão do produto. Em **mobile**, apresenta um hero section com o logo e a marca no topo, seguido de um card escuro que sobe da parte inferior com o formulário de login. Em **desktop**, exibe um layout split-screen: lado esquerdo com o "brand panel" — features, prova social com "+1.200 motoristas" e botão de criação de conta — e lado direito com o formulário.

**O que tem:**
- Campo email + senha com toggle show/hide
- Validação de campos obrigatórios
- Botão de login com spinner de loading
- Link "Esqueceu sua senha?" e "Criar conta"
- Botão Google Sign-In (UI apenas)
- Suporte a dark/light mode
- Scrollable em telas pequenas

### 2. RegisterScreen — Criação de Conta
Tela de cadastro com dois painéis no mobile e split-screen no desktop (similar ao Login). O formulário é dividido em seções: **Dados Pessoais** (nome, email, WhatsApp com seletor de país) e **Segurança** (senha + confirmação). Tem um indicador de força de senha em 4 níveis (Fraca → Forte), seletor de código de país (+55 Brasil padrão) e uma tela de sucesso com animações ao concluir o cadastro.

### 3. DashboardScreen — Central de Operações
A tela principal após o login. Exibe uma saudação personalizada com o nome do motorista, a data atual e um indicador de sincronização em tempo real (pulse dot verde animado).

**O que tem:**
- **Header escuro** com gradiente e elementos decorativos
- **Relógio** atualizado a cada minuto
- **Botões de Rota** (Manhã ☀️ / Tarde 🌤️ / Noite 🌙) com contagem de passageiros
- **OccupancySummary**: donut chart SVG + stats em 3 colunas (VAI / NÃO VAI / PENDENTE)
- **Feed de respostas recentes** do WhatsApp Bot (ao vivo simulado)
- **Alerta inteligente**: se houver pendentes, exibe dica de ir ao WhatsApp
- **Layout adaptativo**: em desktop vira grid 2 colunas com stats extras no header

### 4. RouteScreen — Gestão de Passageiros
Tela completa de CRUD de passageiros. Possui barra de busca full-text, filtros por status (Todos/VAI/NÃO VAI/PENDENTE) e por período (Todos/Manhã/Tarde/Noite), e grid responsivo de cards (1, 2 ou 3 colunas).

**O que tem:**
- **PassengerCard**: avatar com iniciais coloridas por status, nome, responsável, endereço, badge de status, indicadores de rotas, botões de editar/deletar, links diretos para Waze/Google Maps e WhatsApp
- **PassengerFilters**: chips de filtro com contadores dinâmicos
- **PassengerForm**: formulário completo em modal (bottom sheet) para adicionar ou editar passageiro
- **Modal de confirmação** de exclusão
- **FAB** (botão flutuante) para adicionar novo passageiro
- **EmptyState** quando nenhum resultado encontrado

### 5. WhatsAppScreen — Bot de Mensagens
Painel de gerenciamento da integração com WhatsApp. Em desktop, layout em grid 2 colunas; em mobile, stack vertical.

**O que tem:**
- **ConnectionStatus**: card com status de conexão (conectado/conectando/desconectado), placeholder de QR Code, botão conectar/desconectar
- **ScheduleCard**: 3 inputs de horário (Manhã 06:30 / Tarde 11:45 / Noite 18:15) com botão salvar
- **TemplateEditor**: textarea com o template da mensagem, variáveis clicáveis ([RESPONSÁVEL], [NOME]), botões reset e salvar com feedback visual
- **Alertbox** explicativo com as instruções do bot (1=VAI, 2=NÃO VAI)

### 6. SettingsScreen — Configurações
Tela de configurações completa com 8 seções em accordion expansível.

**O que tem:**
- **ProfileHeader**: foto/iniciais, nome, email, placa e modelo do veículo, mini-stats, botão de editar perfil
- Seção **Estatísticas & Dashboard** (gráfico donut + gráfico de barras semanal + métricas mensais)
- Seção **Gerenciar Passageiros** (atalhos rápidos)
- Seção **Notificações** (toggles para WhatsApp, Push, lembrete de pendentes, som de alerta)
- Seção **Preferências** (toggle dark/light mode + idioma pt-BR/EN/ES)
- Seção **Configurações de Turnos** (ativar/desativar Manhã/Tarde/Noite + horários)
- Seção **Alterar Senha** (campos atual/nova/confirmar com validação)
- Seção **Suporte & Ajuda** (links de help, vídeo, chat, feedback + versão do app)
- Seção **Sair** (logout)

---

## Os Componentes

### Compartilhados (`components/shared/`)
| Componente | O que faz |
|---|---|
| **Avatar** | Círculo com iniciais coloridas pelo status do passageiro |
| **StatusBadge** | Badge colorida (VAI/NÃO VAI/PENDENTE) em 3 tamanhos |
| **StatusDot** | Ponto colorido minúsculo de status |
| **BottomSheetModal** | Modal adaptável: bottom sheet no mobile, centralizado no desktop |
| **FormInput** | Input com label, ícone à esquerda, elemento à direita opcional |
| **Toggle** | Switch on/off com cores temáticas |
| **SectionCard** | Card com barra de acento colorida e título |
| **EmptyState** | Tela vazia com ícone, título e CTA |

### Dashboard (`components/dashboard/`)
| Componente | O que faz |
|---|---|
| **RouteButton** | Botão de rota com emoji, horário, cor temática e contagem |
| **OccupancySummary** | Card escuro com DonutRing + 3 colunas de stats |
| **UpdateRow** | Linha de atualização do feed WhatsApp (avatar + mensagem + badge) |

### Passageiros (`components/passengers/`)
| Componente | O que faz |
|---|---|
| **PassengerCard** | Card completo do passageiro com todas as ações |
| **PassengerFilters** | Chips de filtro com contadores dinâmicos |
| **PassengerForm** | Formulário de adicionar/editar passageiro |

### Charts (`components/charts/`)
| Componente | O que faz |
|---|---|
| **DonutRing** | SVG circular com 3 arcos por status e total no centro |
| **WeeklyBarChart** | Barras agrupadas por dia (Recharts) com tooltip customizado |

### WhatsApp (`components/whatsapp/`)
| Componente | O que faz |
|---|---|
| **ConnectionStatus** | Card de status + QR code |
| **ScheduleCard** | 3 horários com salvar |
| **TemplateEditor** | Editor de template com variáveis |
| **WhatsAppHeader** | Header verde com status de conexão |

### Settings (`components/settings/`)
10 subcomponentes: ProfileHeader, AccordionItem, StatsSection, PassengersSection, NotificationsSection, PreferencesSection, ShiftsSection, PasswordSection, SupportSection, ProfileEditModal

### Layout (`components/`)
| Componente | O que faz |
|---|---|
| **AppLayout** | Shell principal com SideNav, BottomNav e área de conteúdo |
| **SideNav** | Sidebar 264px (desktop lg+) com brand, stats ao vivo, nav, user card |
| **BottomNav** | Navegação inferior (mobile/tablet <lg) com 4 botões e badge de pendentes |

---

## O Design System

### Paleta Principal
```
#FFC107  → pending/primary (amarelo — cor da marca)
#198754  → success/going   (verde — aluno vai)
#DC3545  → danger/absent   (vermelho — não vai)
#FD7E14  → warning         (laranja — pendente / turno tarde)
#6C5CE7  → night           (roxo — turno noite)
#25D366  → whatsapp        (verde WhatsApp)
#2979FF  → info            (azul)
```

### Breakpoints (Bootstrap 5)
```
< 576px  → isMobile  (celulares pequenos)
≥ 576px  → isSm
≥ 768px  → isMd      (tablets — modal centralizado)
≥ 992px  → isLg      (SideNav visível, BottomNav some)
≥ 1200px → isDesktop (grid desktop, stats extras)
≥ 1400px → isXxl     (3 colunas de cards)
```

### Tokens de Cor (theme.css)
O arquivo `src/styles/theme.css` define variáveis CSS para light e dark mode usando `oklch()` para cores base do Shadcn e hex para as cores semânticas da aplicação. O Tailwind v4 expõe essas variáveis via `@theme inline`, permitindo classes como `bg-pending`, `text-success`, `border-danger`.

### Tipografia
- **Fonte**: Inter (Google Fonts, pesos 300–900)
- **Base**: 16px no `html`
- **Hierarquia**: títulos em `font-black` (900), subtítulos em `font-extrabold` (800), corpo em `font-medium` (500)

---

## Os Contextos Globais

### AuthContext
Gerencia autenticação simulada. `login()` aceita qualquer email não-vazio (delay de 900ms para simular API). `register()` cria usuário com delay de 1s. O usuário mock é **Carlos Andrade** (carlos@smartroutes.app, van Mercedes Sprinter, placa BRA-2E19).

### ThemeContext
Gerencia dark/light mode com persistência em `localStorage`. Aplica a classe `.dark` ao `<html>` para o Tailwind v4 funcionar. Expõe também `useColors()` com 20+ tokens de cor para uso em inline styles quando necessário.

### NavDrawerContext
Contexto simples que expõe `openDrawer()` — qualquer tela pode abrir o drawer lateral em mobile sem saber da implementação.

---

## Os Hooks Customizados

### `useWindowSize` + `useBreakpoints`
Detecta dimensões da janela e mapeia para breakpoints Bootstrap 5. SSR-safe (default 1280×800). Usado em praticamente todas as telas para layout responsivo.

### `usePassengers`
CRUD completo de passageiros em memória. Recebe parâmetros de busca, filtro de status e período. Retorna lista filtrada e ordenada (`going` → `pending` → `absent`), contagens por status, e funções `add/edit/remove`. Usa `useMemo` para performance.

### `useDailyList`
Calcula resumo do dia (going/absent/pending/total) a partir da lista de passageiros. Filtra por período se necessário. Usado pelo Dashboard e Settings.

### `useWhatsApp`
Gerencia todo o estado da tela WhatsApp: conexão simulada (2.2s de QR scan), horários de agendamento, template de mensagem, flags de feedback (saved) com auto-dismiss de 2s.

---

## O que foi Construído e Modificado — Linha do Tempo

### Fase 1: Estrutura Base (projeto original)
O projeto foi iniciado como um design system Figma exportado para React. As telas foram construídas de forma monolítica, com componentes inline e cores hardcoded. Funcionava, mas era difícil de manter.

### Fase 2: Refatoração Arquitetural
O projeto passou por uma grande refatoração para separar responsabilidades:

**Criados do zero:**
- `src/app/types/index.ts` — tipos centralizados (antes espalhados em mockData e contextos)
- `src/app/hooks/usePassengers.ts` — CRUD de passageiros extraído de RouteScreen
- `src/app/hooks/useWhatsApp.ts` — estado do bot extraído de WhatsAppScreen
- `src/app/hooks/useDailyList.ts` — cálculo de resumo diário
- `src/app/components/shared/BottomSheetModal.tsx` — modal unificado
- `src/app/components/shared/FormInput.tsx` — input reutilizável
- `src/app/components/shared/SectionCard.tsx` — card de seção
- `src/app/components/shared/EmptyState.tsx` — estado vazio
- `src/app/components/shared/Toggle.tsx` — switch temático
- `src/app/components/dashboard/RouteButton.tsx` — extraído do Dashboard
- `src/app/components/dashboard/UpdateRow.tsx` — extraído do Dashboard
- `src/app/components/dashboard/OccupancySummary.tsx` — extraído do Dashboard
- `src/app/components/passengers/PassengerCard.tsx` — extraído de RouteScreen
- `src/app/components/passengers/PassengerFilters.tsx` — extraído de RouteScreen
- `src/app/components/passengers/PassengerForm.tsx` — extraído de RouteScreen
- `src/app/components/charts/DonutRing.tsx` — SVG extraído
- `src/app/components/charts/WeeklyBarChart.tsx` — Recharts extraído
- `src/app/components/whatsapp/ConnectionStatus.tsx` — extraído de WhatsAppScreen
- `src/app/components/whatsapp/ScheduleCard.tsx` — extraído de WhatsAppScreen
- `src/app/components/whatsapp/TemplateEditor.tsx` — extraído de WhatsAppScreen
- `src/app/components/whatsapp/WhatsAppHeader.tsx` — extraído
- Todos os 10 subcomponentes de `settings/`

**Modificados:**
- `src/styles/theme.css` — adicionados tokens semânticos (`--success`, `--danger`, `--warning`, `--pending`, `--info`, `--whatsapp`, `--night`) e expostos via `@theme inline` para Tailwind
- `src/app/data/mockData.ts` — tipos removidos (agora em `types/index.ts`), re-exportados para compatibilidade
- `src/app/components/shared/Avatar.tsx` — inline styles trocados por classes Tailwind semânticas
- `src/app/components/shared/StatusBadge.tsx` — inline styles trocados por classes Tailwind
- Todas as 4 telas principais enxugadas de 300–1097 linhas para ≤150 linhas cada

### Fase 3: Correções de Bugs e UX

**Dark Mode não funcionava:**
- **Problema:** `ThemeContext` atualizava o estado React mas nunca aplicava a classe `.dark` no `<html>`
- **Solução:** Adicionado `useEffect` que chama `document.documentElement.classList.toggle('dark', isDark)` + persistência em `localStorage`
- **Arquivo:** `src/app/context/ThemeContext.tsx`

**Modal de passageiro aparecia fora da tela (PC):**
- **Problema:** Classes Tailwind (`sm:top-1/2 sm:left-1/2`) conflitavam com as classes base do Radix Sheet (`inset-x-0 bottom-0`) por especificidade CSS
- **Solução:** Detectar `isMd` via `useBreakpoints` e aplicar inline `style` com `top: '50%', left: '50%', transform: 'translate(-50%, -50%)'` — bypassa o conflito de especificidade
- **Arquivo:** `src/app/components/shared/BottomSheetModal.tsx`

**Modal cortava conteúdo na parte inferior:**
- **Problema:** Inner div do modal tinha `overflow-y-auto max-h-[88dvh]` fazendo todo o `PassengerForm` (incluindo header e footer sticky) scrollar como uma unidade
- **Solução:** Inner div virou `flex flex-col flex-1 min-h-0 overflow-hidden`; `PassengerForm` outer div mudou de `max-h-[92dvh]` para `flex-1 min-h-0` — agora só a área do meio scrolla
- **Arquivos:** `BottomSheetModal.tsx` + `PassengerForm.tsx`

**"Rota Noite" não preenchia largura total no mobile:**
- **Problema:** O `RouteButton` com `flex-1` estava em `<div>` sem `display: flex`, então o `flex-1` não tinha efeito
- **Solução:** Adicionada classe `flex` no `<div>` wrapper
- **Arquivo:** `src/app/screens/DashboardScreen.tsx`

**Tela de Login: logo ficava fixo ao scrollar (mobile):**
- **Problema:** Hero section com `flexShrink: 0` dentro de container com `overflow: hidden` — só o card scrollava, o hero ficava preso
- **Solução:** Outer container virou o scroll container (`height: 100dvh` + `overflowY: auto` + `WebkitOverflowScrolling: touch`); card mudou para `flexShrink: 0` em vez de `flex: 1`; hero sem flexShrink
- **Arquivo:** `src/app/screens/LoginScreen.tsx`

**Tela de Login: não scrollava depois da correção:**
- **Problema:** `src/styles/index.css` define `body { overflow: hidden }` para TODOS os breakpoints — qualquer scroll precisa estar em um container filho, não no body
- **Solução:** Garantir que o outer container da LoginScreen É o scroll container (`height: 100dvh` + `overflowY: auto`), e não depender do body para scroll
- **Arquivo:** `src/app/screens/LoginScreen.tsx`

### Fase 4: Documentação e Configuração

**`.gitignore` atualizado:**
```
node_modules
dist
.env
.env.local
.claude/scheduled_tasks.lock
.claude/settings.local.json
```

---

### Fase 5: Limpeza de Dependências — Removendo o Peso Morto

O projeto acumulou bibliotecas que nunca chegaram a ser usadas de verdade. Antes de escalar, era necessário limpar esse peso.

**Como foi feito:**
Cada dependência suspeita foi verificada com busca de imports por toda a base de código (`src/**/*.ts` e `.tsx`). Só depois de confirmar ausência total de uso é que a remoção foi feita.

**Dependências removidas do `package.json`:**

| Biblioteca | Motivo da remoção |
|---|---|
| `@mui/material` + `@mui/icons-material` | Nenhum import encontrado em lugar algum |
| `@emotion/react` + `@emotion/styled` | Eram peer deps do MUI — removidos junto |
| `motion` | Nenhum import encontrado (animações feitas com CSS/Tailwind) |
| `react-dnd` + `react-dnd-html5-backend` | Nenhum import encontrado (drag-and-drop nunca implementado) |
| `canvas-confetti` | Nenhum import encontrado (efeito de confete nunca usado) |
| `date-fns` | Nenhum import encontrado (datas formatadas com `Intl` nativo do JS) |
| `@popperjs/core` + `react-popper` | Sem uso — eram resquícios de um setup antigo |
| `react-slick` + `react-responsive-masonry` | Sem uso — carrossel e masonry nunca implementados |

**Atenção especial — o que foi MANTIDO mesmo parecendo sem uso:**
- `vaul` — é usado internamente pelo `src/components/ui/drawer.tsx` (wrapper Shadcn)
- `sonner` — é usado internamente pelo `src/components/ui/sonner.tsx` (wrapper Shadcn)
- `recharts` — é usado em `WeeklyBarChart.tsx`, `StatsSection.tsx` e `ui/chart.tsx`

**Resultado:** 13 pacotes e suas sub-dependências removidos. Build verificado com `npm run build` — zero erros TypeScript, zero imports quebrados.

---

### Fase 6: Camada de Services — Preparando para o Backend Real

O problema anterior: os componentes e hooks importavam dados diretamente de `mockData.ts`. Isso criava acoplamento forte — se um dia o backend real chegasse, seria necessário alterar dezenas de arquivos.

**Solução:** criar uma camada `services/` que encapsula o acesso aos dados. Os consumidores falam com o serviço; o serviço fala com a fonte de dados. Só o serviço precisa mudar quando o backend chegar.

**Arquivos criados:**

`src/app/services/passengerService.ts`
```ts
import { passengers as MOCK_PASSENGERS, getSummary as computeSummary } from '../data/mockData';
import type { Passenger, Summary } from '../types';

export function getPassengers(): Passenger[] {
  return MOCK_PASSENGERS;
}

export function getSummary(list: Passenger[] = MOCK_PASSENGERS): Summary {
  return computeSummary(list);
}
```

`src/app/services/dashboardService.ts`
```ts
import { recentUpdates as MOCK_UPDATES, routeConfigs as MOCK_ROUTES } from '../data/mockData';
import type { WhatsAppUpdate, RouteConfig } from '../types';

export function getRecentUpdates(): WhatsAppUpdate[] {
  return MOCK_UPDATES;
}

export function getRouteConfigs(): RouteConfig[] {
  return MOCK_ROUTES;
}
```

`src/app/services/index.ts`
```ts
export * from './passengerService';
export * from './dashboardService';
```

**Arquivos migrados** (trocaram `from '../data/mockData'` por `from '../services/...`'):
- `src/app/hooks/usePassengers.ts`
- `src/app/hooks/useDailyList.ts`
- `src/app/components/SideNav.tsx`
- `src/app/components/BottomNav.tsx`
- `src/app/screens/DashboardScreen.tsx`
- `src/app/screens/SettingsScreen.tsx`

**Bug encontrado e corrigido durante a migração:**
Em `SideNav.tsx`, a variável foi nomeada incorretamente como `_passengers` mas o restante do arquivo referenciava `passengers`. O TypeScript identificou o erro — corrigido renomeando para `passengers`.

Em `SettingsScreen.tsx`, o import de `getPassengers` foi adicionado mas faltou declarar a variável dentro da função do componente. Corrigido adicionando `const passengers = getPassengers()` logo após os hooks.

Build verificado novamente após todas as migrações — zero erros.

---

### Fase 7: Testes Automatizados — Vitest Configurado

O projeto não tinha nenhum teste. A seção "O que NÃO existe" dizia exatamente isso. Hora de mudar.

**Configuração do ambiente de testes:**

`vite.config.ts` — bloco `test` adicionado:
```ts
export default defineConfig({
  test: {
    environment: 'jsdom',   // DOM virtual para componentes React
    globals: true,          // describe/it/expect sem importar explicitamente
    setupFiles: './src/test/setup.ts',
  },
  // ...
})
```

`src/test/setup.ts` — carrega os matchers do jest-dom:
```ts
import '@testing-library/jest-dom';
```

**Scripts adicionados ao `package.json`:**
```json
"test": "vitest run",       // roda uma vez e sai (CI)
"test:watch": "vitest"      // modo watch interativo (desenvolvimento)
```

**Testes escritos:**

`src/test/passengerService.test.ts` — 3 testes unitários do serviço:
```ts
it('retorna lista com 12 passageiros')
it('getSummary soma corretamente going + absent + pending = total')
it('getSummary com lista vazia retorna zeros')
```

`src/test/StatusBadge.test.tsx` — 3 testes de componente React:
```ts
it('exibe "VAI" para status going')
it('exibe "NÃO VAI" para status absent')
it('exibe "PENDENTE" para status pending')
```

**Resultado final:**
```
 RUN  v4.1.4

 Test Files  2 passed (2)
      Tests  6 passed (6)
   Duration  2.18s
```

6/6 testes passando. Build limpo. Projeto pronto para crescer com testes.

---

## Dados Mock (o "banco de dados" atual)

12 passageiros cadastrados:
- 6 com status `going` (confirmados)
- 3 com status `absent` (não vão)
- 3 com status `pending` (aguardando resposta)

3 rotas configuradas:
- **Manhã** ☀️ 07:15 — 7 passageiros — cor #FFC107
- **Tarde** 🌤️ 12:30 — 6 passageiros — cor #FD7E14
- **Noite** 🌙 19:00 — 4 passageiros — cor #6C5CE7

5 atualizações recentes de WhatsApp simuladas (feed ao vivo)

---

## O que NÃO existe (ainda)

- **Backend / API real** — todos os dados são mockados em memória, resetam ao recarregar
- **Banco de dados** — nenhum dado persiste além do `localStorage` (apenas tema)
- **WhatsApp real** — a integração com bot é simulada (sem Twilio, Meta API, etc.)
- **Autenticação real** — qualquer email/senha funciona
- **Testes de integração / E2E** — existem testes unitários (Vitest), mas sem testes end-to-end (Playwright, Cypress)
- **Deploy** — sem CI/CD configurado, sem service worker, sem manifest PWA completo
- **Internacionalização** — strings hardcoded em PT-BR
- **Notificações push reais** — apenas UI
