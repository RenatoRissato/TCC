# SmartRoutes PWA — Documento de Escopo & História do Projeto

---

## O que é o SmartRoutes?

O **SmartRoutes** é um PWA (Progressive Web App) mobile-first desenvolvido para **motoristas de vans escolares**. O problema que ele resolve é simples e real: todo dia, o motorista precisa saber quais alunos vão ou não vão na van — e isso geralmente é feito por ligações, mensagens manuais no WhatsApp ou planilhas. O SmartRoutes automatiza esse processo com um **bot de WhatsApp** que envia perguntas automáticas para os responsáveis e consolida as respostas em um dashboard visual e intuitivo.

O produto é uma plataforma SaaS para o segmento escolar brasileiro, com suporte completo a **dark mode**, **responsividade total** (mobile, tablet e desktop) e identidade visual própria baseada em amarelo (#FFC107) como cor primária. A partir da Fase 9 (abril/2026), o projeto tem **backend real com Supabase** — autenticação, banco de dados PostgreSQL e Edge Functions — substituindo integralmente os dados mockados.

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

**Tela preta ao iniciar a home (Google Translate quebrando o React):**
- **Problema:** O Google Translate do navegador interceptava o conteúdo da aplicação e substituía os nós de texto diretamente no DOM. Isso corrompia a árvore de elementos gerenciada pelo React — botões ficavam vazios, textos sumiam e a tela aparecia preta/quebrada ao abrir a home
- **Solução 1 — `index.html`:** Adicionado `lang="pt-BR"` e `translate="no"` na tag `<html>`, `<meta name="google" content="notranslate">` no `<head>`, e `class="notranslate"` no `<body>`. Isso instrui navegadores e bots a não traduzir a aplicação
- **Solução 2 — `LoginScreen.tsx`:** Textos inline dentro de botões (`Entrando...`, `Entrar`) foram envolvidos em `<span>` — nós de texto soltos são os mais suscetíveis à corrupção pelo Translate
- **Bônus:** Título da aba atualizado de `"Mobile Dashboard Design System"` para `"SmartRoutes"`
- **Arquivos:** `index.html`, `src/app/screens/LoginScreen.tsx`

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

**Atualização do Vite para 6.4.2:**
- Vite e `@vitejs/plugin-react` foram atualizados para garantir compatibilidade com as versões mais recentes das dependências e corrigir alertas de deprecação no build
- Somente `package.json` e `package-lock.json` foram alterados — sem impacto no código da aplicação

**Criação do `.cursorrules` e `sobreprojeto.md`:**
- `.cursorrules` — arquivo de contexto usado pelo Claude Code para entender as regras do projeto: stack, convenções de código, arquitetura, padrões de nomenclatura e comportamentos esperados. Funciona como um "briefing permanente" para o assistente
- `sobreprojeto.md` — documento inicial descrevendo o produto, o problema que resolve e as decisões arquiteturais. Foi a semente do `PROJETO_historico.md`

**`.gitignore` criado:**
```
node_modules
dist
.env
.env.local
.claude/scheduled_tasks.lock
.claude/settings.local.json
```

**Reorganização da pasta `docs/` — centralizando a documentação:**
- `PROJETO.md` foi renomeado e movido para `docs/PROJETO_historico.md` (este arquivo)
- `sobreprojeto.md` (raiz) foi movido para `docs/sobreprojeto.md`
- Novos documentos técnicos criados na pasta `docs/`:
  - `docs/banco.md` — modelagem do banco de dados para o backend futuro
  - `docs/Edge_Functions.md` — estratégia de Edge Functions para a API
  - `docs/evolution_api.md` — integração planejada com Evolution API (WhatsApp real)
  - `docs/requisitos_resumido.md` — requisitos funcionais e não-funcionais resumidos
  - `docs/diagrama_arquitetura.md` — diagrama textual da arquitetura do sistema
  - `docs/smartroutes_architecture_v3.svg` — diagrama visual SVG da arquitetura

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

### Fase 8: Correção do Pop-up de Exclusão no Mobile

**Pop-up de confirmação de exclusão aparecia na parte inferior da tela no mobile:**
- **Problema:** O modal de confirmação ("Remover Passageiro?") usava o componente `BottomSheetModal`, que no mobile sempre exibe o conteúdo vindo de baixo (bottom sheet). No desktop (≥768px) ele já centralizava automaticamente via `isMd`, mas no celular ficava colado na parte inferior da tela — visualmente errado para um diálogo pequeno de confirmação
- **Causa raiz:** A lógica de centralização dentro de `BottomSheetModal` era exclusivamente baseada no breakpoint `isMd`. Não havia forma de forçar o modo centralizado independente do tamanho da tela
- **Solução:** Adicionada prop `forceCenter?: boolean` ao `BottomSheetModal`. Quando `true`, o componente usa o estilo centralizado (`top: 50%, left: 50%, transform: translate(-50%, -50%)`) independente do breakpoint. A variável interna `isMd` foi substituída por `centered = isMd || forceCenter` em todos os pontos de decisão do componente
- **Aplicação:** O modal de exclusão em `RouteScreen.tsx` passou a receber `forceCenter` — o modal de adicionar/editar passageiro (grande, scroll) continua como bottom sheet no mobile conforme o esperado
- **Arquivos:** `src/app/components/shared/BottomSheetModal.tsx`, `src/app/screens/RouteScreen.tsx`

---

## Dados Mock (o "banco de dados" atual)

> **Nota:** A partir da Fase 9, o projeto usa dados reais do Supabase. Os mocks abaixo foram a base de desenvolvimento até a integração real.

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

### Fase 9: Integração Real com Supabase — Backend Completo (30/04/2026)

Esta fase marca a transição do projeto de protótipo mockado para uma aplicação com backend real. Todos os dados agora persistem no Supabase (PostgreSQL + Auth + Edge Functions).

---

#### 9.1 — Supabase configurado e banco de dados criado

**Backend Supabase:**
- Projeto criado no Supabase com PostgreSQL gerenciado
- `src/lib/supabase.ts` criado com `createClient` configurado com `persistSession`, `autoRefreshToken`, `detectSessionInUrl` e `storageKey: 'smartroutes-auth-v1'` (evita reutilização de sessões obsoletas ao trocar anon key)
- Anon key migrada do formato `sb_publishable_*` para JWT (`eyJ...`) compatível com o SDK mais recente

**Tabelas criadas via migrations SQL:**

| Tabela | Descrição |
|---|---|
| `motoristas` | Perfil do motorista (nome, email, telefone, cnh, user_id FK para auth.users) |
| `rotas` | Rotas de transporte (nome, horario_saida, status, motorista_id) |
| `passageiros` | Passageiros por rota (nome_completo, responsavel, endereco, telefone, rota_id, motorista_id, status) |
| `confirmacoes` | Respostas diárias (passageiro_id, data, status, tipo_confirmacao, respondida_em) |
| `viagens` | Viagens iniciadas (rota_id, motorista_id, data, status, iniciada_em, finalizada_em) |
| `viagem_passageiros` | Passageiros por viagem (viagem_id, passageiro_id, status_embarque) |

**RLS (Row Level Security):** todas as tabelas têm RLS ativado com políticas que garantem que cada motorista acessa apenas seus próprios dados (`motorista_id = auth.uid()` ou via join com `motoristas`).

---

#### 9.2 — Migration de GRANTs (bug crítico de 403)

**Problema:** RLS policies corretas não bastam — o PostgreSQL também exige `GRANT` explícito ao role `authenticated` para que as queries funcionem. Sem o GRANT, todas as chamadas retornavam `403 permission denied` mesmo com JWT válido.

**Arquivo criado:** `supabase/migrations/20260429000000_grants_authenticated.sql`

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON motoristas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rotas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON passageiros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON confirmacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON viagens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON viagem_passageiros TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

---

#### 9.3 — Edge Function: `criar-perfil-motorista`

**Localização:** `supabase/functions/criar-perfil-motorista/index.ts`

**Responsabilidade:** Criar o registro na tabela `motoristas` após o cadastro via `supabase.auth.signUp`. Como o `signUp` cria o usuário em `auth.users` mas não na tabela `motoristas`, essa Edge Function é chamada logo após o signup bem-sucedido.

**Por que Edge Function e não INSERT direto?**
- O INSERT em `motoristas` precisa do `user_id` do usuário autenticado
- A Edge Function roda com o JWT do usuário, garantindo que `auth.uid()` retorna o id correto para as policies RLS
- Padrão mais seguro que expor `service_role` no cliente

**Fluxo de criação de motorista:**
1. `supabase.auth.signUp()` → cria em `auth.users`
2. `supabase.functions.invoke('criar-perfil-motorista', { body: { nome, telefone, cnh } })` → cria em `motoristas`
3. `criarRotasPadrao(motorista.id)` → cria as 3 rotas padrão

---

#### 9.4 — `AuthContext.tsx` — Refatoração completa de hidratação de sessão

O `AuthContext` foi reescrito do zero para suportar autenticação real com Supabase.

**Estrutura anterior:** login mockado com delay de 900ms, usuário hardcoded "Carlos Andrade".

**Estrutura nova:**

**`hidratarSessao(session)`** — função central chamada pelo `onAuthStateChange`:
1. **Fallback imediato do JWT** (zero await): extrai `nome`, `email`, `telefone` do `user_metadata` do token e atualiza o estado imediatamente — sem esperar query ao banco. Garante que o header mostre nome/email instantaneamente.
2. **Carrega o perfil real** em background via `carregarMotorista(userId)` com timeout de 15s. Se travar, mantém o fallback do JWT sem quebrar a UX.
3. **Auto-criação do perfil** se motorista não existir: chama `criar-perfil-motorista` Edge Function com timeout de 10s. Isso cobre o caso de confirmação de email — o perfil é criado no primeiro login após confirmar.
4. **Cria rotas padrão** apenas quando `motoristaAcabouDeNascer=true` (evita query extra em todo refresh).

**`useRef lastLoadedUserId`** — cache da última sessão hidratada:
- `onAuthStateChange` dispara eventos `TOKEN_REFRESHED` a cada ~50 minutos e `SIGNED_IN` ao voltar da aba
- Sem o ref, cada evento reexecutaria `carregarMotorista` — query desnecessária + risco de timeout em aba acordando do background
- Com o ref: se o `user_id` não mudou, `hidratarSessao` retorna imediatamente sem nenhuma query

**`ehErroDeJwtInvalido(error)`** — detecção de JWT inválido:
- Quando o JWT está expirado ou inválido, o PostgREST trata a request como `anon`
- O Postgres retorna `42501 permission denied` com hint contendo `"TO anon"`
- Ao detectar esse padrão, `carregarMotorista` faz `signOut()` automático, forçando o usuário a fazer login novamente

**`logout` otimista:**
- `setUser(null)` e `setMotoristaId(null)` executam **sincronamente** — a UI vai para o login instantaneamente sem esperar round-trip de rede
- `supabase.auth.signOut({ scope: 'local' })` roda em background (não bloqueante)
- `scope: 'local'` invalida apenas esta sessão (não logout em outros dispositivos) e responde mais rápido que o default `global`

**`withTimeout<T>(promise, ms)`** — utilitário de timeout:
```ts
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms)
    ),
  ]);
}
```
Aplicado em: `carregarMotorista` (15s), `criar-perfil-motorista` Edge Function (10s), `signInWithPassword` (30s).

**`onAuthStateChange` como única fonte da sessão:**
- Não usamos mais `supabase.auth.getSession()` separadamente — `onAuthStateChange` dispara `INITIAL_SESSION` ao se inscrever, eliminando a race condition entre os dois
- `safety timer` de 5s garante que `setLoading(false)` acontece mesmo se o listener nunca disparar

---

#### 9.5 — `App.tsx` — Loading screen removida

**Antes:** `App.tsx` mostrava uma tela "Carregando..." enquanto `loading === true` no `AuthContext`.

**Problema:** Se `setLoading(false)` travasse (bug de timeout, network frio), o app ficava em tela preta infinita.

**Solução:** A loading screen foi removida. O app vai direto para `AuthGate`, que decide se mostra `LoginScreen` ou `RouterProvider` com base em `isAuthenticated`. O usuário sempre vê a tela de login imediatamente — sem bloqueio.

---

#### 9.6 — `rotaService.ts` — Dados reais + rotas padrão automáticas

**Arquivo:** `src/app/services/rotaService.ts` (criado do zero)

**`listarRotas()`** — busca rotas ativas do motorista logado:
```ts
supabase.from('rotas').select('*').eq('status', 'ativa').order('horario_saida', { ascending: true })
```

**`listarRotasComContagem()`** — busca rotas + contagem de passageiros ativos por rota (2 queries, sem JOIN para simplicidade):
1. Lista todas as rotas ativas
2. Conta passageiros com `status = 'ativo'` por `rota_id`
3. Mapeia para `RouteConfig[]` com emoji/cor baseados no nome da rota (`inferirRouteType`)

**`criarRotasPadrao(motoristaId)`** — idempotente:
```ts
// 1. Verifica se já existem rotas para este motorista
// 2. Se não existir nenhuma, insere as 3 padrão:
{ nome: 'Rota Manhã', horario_saida: '07:00', status: 'ativa' }
{ nome: 'Rota Tarde', horario_saida: '12:00', status: 'ativa' }
{ nome: 'Rota Noite', horario_saida: '17:30', status: 'ativa' }
```

**`inferirRouteType(nome)`** — deduz o turno a partir do nome:
```ts
if (n.includes('tarde') || n.includes('afternoon')) return 'afternoon';
if (n.includes('noite') || n.includes('night')) return 'night';
return 'morning'; // default
```

---

#### 9.7 — `dashboardService.ts` — Respostas recentes com dados reais

**Antes:** `getRecentUpdates()` retornava `MOCK_UPDATES` (array hardcoded).

**Depois:** query real na tabela `confirmacoes` com join em `passageiros`:

```ts
supabase
  .from('confirmacoes')
  .select('id, status, tipo_confirmacao, respondida_em, passageiros!inner(nome_completo)')
  .in('status', ['confirmado', 'ausente'])
  .not('respondida_em', 'is', null)
  .order('respondida_em', { ascending: false })
  .limit(5)
```

**Funções auxiliares:**
- `obterIniciais(nome)` — extrai iniciais do nome (ex: "João Silva" → "JS")
- `formatarTempoRelativo(iso)` — formata tempo (ex: "há 3 min", "há 2h", "há 1d")
- `mensagemPorTipo(tipo, indo)` — texto da resposta baseado em `tipo_confirmacao` (ida_e_volta / somente_ida / somente_volta)

**`getRouteConfigs()`** — delega para `listarRotasComContagem()` em `rotaService.ts`.

---

#### 9.8 — `DashboardScreen.tsx` — Integração de dados reais

**`recentUpdates`** virou `useState<WhatsAppUpdate[]>([])` com `useEffect` async:
```ts
useEffect(() => {
  let ativo = true;
  getRecentUpdates()
    .then(u => { if (ativo) setRecentUpdates(Array.isArray(u) ? u : []); })
    .catch(err => { console.error('getRecentUpdates:', err); if (ativo) setRecentUpdates([]); });
  return () => { ativo = false; };
}, []);
```

**Navegação com filtro pré-selecionado:** `RouteButton.onClick` navega para `/routes?turno=${rc.type}` (ex: `/routes?turno=morning`), e a `RouteScreen` inicializa o filtro de período a partir desse query param.

---

#### 9.9 — `RouteScreen.tsx` — Sincronização de filtro com URL

**`useSearchParams`** adicionado para sincronizar o filtro de período com a URL:

```ts
const [searchParams, setSearchParams] = useSearchParams();
const [period, setPeriod] = useState<PassengerPeriod>(
  () => turnoInicialDaQuery(searchParams)  // lazy init lê o ?turno= da URL
);

const handlePeriodChange = useCallback((p: PassengerPeriod) => {
  setPeriod(p);
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    if (p === 'all') next.delete('turno');
    else next.set('turno', p);
    return next;
  }, { replace: true });
}, [setSearchParams]);
```

Isso permite que o Dashboard envie o usuário para `RouteScreen` com o filtro correto já aplicado (ex: clicou em "Rota Tarde" → abre a tela de rotas já no turno tarde).

---

#### 9.10 — Hooks migrados para dados reais

**`usePassengers`** — agora busca passageiros do Supabase via `motoristaId` do `AuthContext`. Suporta filtro por `rota_id` baseado no período selecionado (faz query para obter a rota correspondente ao turno e filtra os passageiros daquela rota).

**`useDailyList`** — calcula o summary (going/absent/pending/total) a partir da lista retornada pelo `usePassengers`.

**`useIniciarViagem`** — novo hook que faz INSERT em `viagens` e redireciona para a tela de viagem em andamento.

---

#### Bugs corrigidos na Fase 9

| Bug | Causa | Fix |
|---|---|---|
| Login travando com "Servidor não respondeu" | `signInWithPassword` sem timeout; `setLoading(false)` nunca executava | `withTimeout(30s)` + `safety timer` no `useEffect` |
| Tela preta "Carregando..." infinita | `loading` nunca virava `false` quando `carregarMotorista` travava | Loading screen removida do `App.tsx` |
| 403 em todas as queries | RLS policies existiam mas faltavam `GRANT` ao role `authenticated` | Migration com `GRANT SELECT/INSERT/UPDATE/DELETE` em todas as tabelas |
| Nome revertendo para email após ~50min | `TOKEN_REFRESHED` re-executava `hidratarSessao` e sobrescrevia o user com fallback | `useRef lastLoadedUserId` evita re-hidratação quando o `user_id` não mudou |
| JWT inválido causando requests como `anon` | Token expirado → PostgREST trata como `anon` → `42501` com hint `TO anon` | `ehErroDeJwtInvalido()` detecta e força `signOut()` automático |
| Rotas não aparecendo após cadastro | Motorista recém-criado não tinha rotas no banco | `criarRotasPadrao()` chamada após criação do motorista |
| Query extra de rotas em todo refresh | `criarRotasPadrao` era chamada em todo `hidratarSessao` | Flag `motoristaAcabouDeNascer` restringe a chamada apenas ao primeiro login |
| Timeout no console ao voltar da aba | Visibility change disparava `carregarMotorista` com aba "fria" | `lastLoadedUserId` ref elimina re-hidratação + timeout aumentado para 15s |
| Logout lento / não redirecionando | `await signOut()` bloqueava a UI até resposta do servidor | `setUser(null)` síncrono + `signOut({ scope: 'local' })` em background |

---

### Fase 10: Roteiro Flexível por Rota — Gerenciar Rotas + Maps (30/04/2026)

Esta fase substitui o conceito antigo de "uma rota = um turno fixo + lista linear de passageiros" por um modelo flexível: cada rota tem um **roteiro ordenado** que mistura passageiros e destinos em qualquer sequência. O motorista também ganhou criação/edição/remoção de rotas direto pelo Dashboard, e o botão Play agora abre o Google Maps com o trajeto completo já montado.

---

#### 10.1 — Modelo: tabela `paradas_rota` + ajustes em `rotas`

**Migration:** `supabase/migrations/20260430000000_paradas_rota.sql`

**Mudanças em `rotas`:**
- `ponto_saida` (text) — endereço único de partida da van (no topo do roteiro)
- `turno` (text, NOT NULL, check em `morning|afternoon|night`) — define cor/ícone independente do nome. Antes, o turno era inferido do nome da rota; agora o usuário pode renomear livremente ("Faculdade Brasil") sem perder a identidade visual.

**Backfill do `turno`** para registros antigos: rotas com "tarde" no nome viram `afternoon`, com "noite"/"night" viram `night`, o resto fica `morning`.

**Nova tabela `paradas_rota`:**

```sql
create table paradas_rota (
  id              uuid primary key,
  rota_id         uuid references rotas(id) on delete cascade,
  ordem           integer not null,
  tipo            text check (tipo in ('embarque','destino')),
  passageiro_id   uuid references passageiros(id) on delete cascade,  -- só p/ embarque
  rotulo          text,        -- só p/ destino, ex: "Faculdade Brasil"
  endereco        text,        -- só p/ destino
  unique (rota_id, ordem),
  check ((tipo='embarque' AND passageiro_id IS NOT NULL) OR
         (tipo='destino'  AND endereco IS NOT NULL))
);
```

A unicidade `(rota_id, ordem)` garante que não há duas paradas na mesma posição. O check constraint garante coerência: embarque sempre tem passageiro, destino sempre tem endereço.

**Backfill do roteiro:** para cada passageiro ativo já existente, é criada uma `parada_rota` do tipo `embarque` preservando o `ordem_na_rota` antigo. Assim, motoristas que já tinham passageiros cadastrados não precisam refazer nada — o roteiro é gerado automaticamente.

**RLS + GRANTs** seguindo o mesmo padrão das outras tabelas.

---

#### 10.2 — Tipos atualizados

`src/app/types/database.ts`:
- `RotaRow` ganha `ponto_saida` e `turno: TurnoRota`
- Novo `ParadaRotaRow` com `tipo: TipoParada` (embarque|destino)

`src/app/types/index.ts`:
- `RouteConfig` ganha `pontoSaida` para o Dashboard usar ao montar a URL do Maps

---

#### 10.3 — `rotaService.ts` reescrito

**Removido:** função `inferirRouteType(nome)` — não é mais necessário deduzir do nome, o `turno` vem direto do banco.

**Atualizado:**
- `listarRotasComContagem`: lê `r.turno` direto. Inclui `pontoSaida` no `RouteConfig` retornado.
- `criarRotasPadrao`: insere `turno` explicitamente nas 3 rotas padrão.

**Novas funções:**
- `criarRota({ motoristaId, nome, turno, horarioSaida, pontoSaida })` — INSERT, retorna `RotaRow`
- `atualizarRota(id, patch)` — UPDATE com campos opcionais
- `apagarRota(id)` — **soft delete** (`status='inativa'`). Hard delete dispararia `on delete cascade` e apagaria passageiros + viagens — perigoso.
- `obterRota(id)` — busca uma rota específica

---

#### 10.4 — `paradaRotaService.ts` (novo)

Camada inteira de manipulação do roteiro. Funções:

- `listarParadasDaRota(rotaId)` — retorna `ParadaItem[]` com passageiros já resolvidos via JOIN. Cada item tem `tipo`, `ordem` e — dependendo do tipo — `nomePassageiro`/`enderecoPassageiro` ou `rotulo`/`enderecoDestino`.
- `listarEnderecosDaRota(rotaId)` — versão simplificada usada pelo Google Maps: array de strings na ordem do roteiro.
- `listarPassageirosNaoIncluidos(rotaId)` — passageiros do motorista que ainda não estão neste roteiro (para o seletor "+ Adicionar passageiro"). Usa `not in` baseado em IDs já presentes em `paradas_rota`.
- `adicionarParadaPassageiro(rotaId, passageiroId)` — calcula próxima ordem e insere
- `adicionarParadaDestino(rotaId, rotulo, endereco)` — idem
- `atualizarParadaDestino(paradaId, { rotulo?, endereco? })` — UPDATE
- `removerParada(paradaId)` — DELETE
- `reordenarParadas(rotaId, ordemFinal[])` — usa **estratégia em 2 passos** para evitar conflito com `UNIQUE (rota_id, ordem)`:
  1. Move tudo para `1000 + novaOrdem` (escapa do range atual)
  2. Move de volta para a `novaOrdem` definitiva

Sem o offset, ao trocar parada A (ordem=2) com B (ordem=3), o primeiro UPDATE tentaria gravar A.ordem=3 enquanto B ainda estava em 3 — violação de unique.

---

#### 10.5 — `utils/maps.ts` (novo)

**`montarUrlGoogleMaps(origem, paradas[])`** — formato oficial da Google:

```
https://www.google.com/maps/dir/?api=1
  &origin=PONTO_SAIDA
  &destination=ULTIMO_ITEM
  &waypoints=ITEM1|ITEM2|ITEM3
  &travelmode=driving
```

Convenção: o **último item da lista** vira `destination`, o resto vira `waypoints`. Retorna `null` quando falta origem ou paradas — aí o Dashboard avisa o motorista a configurar antes.

**`abrirEmNovaAba(janelaPreAberta, url)`** — pop-up blockers: navegadores só permitem `window.open()` em contexto **síncrono** de gesto do usuário. Como precisamos esperar a query async dos endereços antes de saber a URL, abrimos uma janela vazia (`about:blank`) ainda no clique síncrono, depois setamos `.location.href` quando a URL fica pronta.

---

#### 10.6 — `GerenciarRotasModal.tsx` (novo)

Modal completo com **chips de seleção de rota** no topo + **2 abas internas**:

**Header (chips):**
- Lista horizontal scrollável das rotas existentes, cada uma com ícone do turno
- Botão "+ Nova" abre modo de criação (form vazio)

**Aba "Dados da Rota":**
- `nome` (livre) — ex: "Faculdade Brasil"
- `turno` (radio cards Manhã/Tarde/Noite) — define cor e ícone visual
- `horario_saida` (input time)
- `ponto_saida` (input text com endereço)
- Botão **Salvar** (criar ou atualizar conforme contexto)
- Botão **Apagar rota** (com confirmação inline antes de executar)

**Aba "Roteiro":**
- Header com o ponto de saída atual (read-only — edita na aba Dados)
- Lista vertical de **blocos editáveis**, cada um mostrando:
  - Número da posição (1, 2, 3...)
  - Ícone (👤 verde para passageiro, 📍 laranja para destino)
  - Nome/rótulo + endereço
  - Botões `↑` `↓` (reordenar), `✏️` (só destinos — editar inline), `🗑️` (remover)
- Botões `+ Passageiro` e `+ Destino`:
  - **+ Passageiro** abre sub-modal (`PassageiroPicker`) listando passageiros do motorista que ainda não estão neste roteiro
  - **+ Destino** abre form inline com rótulo + endereço

**Reordenar com atualização otimista:** o `setParadas` é atualizado instantaneamente na UI; depois o `reordenarParadas` é chamado. Se falhar, recarrega do banco para resincronizar.

---

#### 10.7 — `DashboardScreen.tsx`

**Botão "Ver todas" → "Gerenciar Rotas":**
- `SectionHead` ganhou prop `ActionIcon` (default `ChevronRight`); aqui passa `Settings`
- Click abre `GerenciarRotasModal`

**Layout flexível para N rotas:**
- Removido o slice fixo `(0,2)` + `[2]` que limitava a 3 rotas
- Substituído por `grid` com `gridTemplateColumns: repeat(2, 1fr)` no mobile e `repeat(min(N,3), 1fr)` no desktop
- Estado vazio (zero rotas): card central com CTA "Gerenciar Rotas"

**Botão Play → Google Maps + Iniciar Viagem:**
```ts
const handleIniciarViagem = async (rotaId: string) => {
  const janelaMaps = window.open('about:blank', '_blank');  // SÍNCRONO
  setRotaIniciandoId(rotaId);
  try {
    const rota = routeConfigs.find(r => r.rotaId === rotaId);
    const enderecos = await listarEnderecosDaRota(rotaId);
    const url = montarUrlGoogleMaps(rota?.pontoSaida, enderecos);
    if (url) abrirEmNovaAba(janelaMaps, url);
    else { janelaMaps?.close(); toast.info('Configure ponto de saída e paradas...'); }

    const r = await iniciarViagem(rotaId);
    if (r) navigate(`/viagem/${r.viagem_id}`);
  } finally {
    setRotaIniciandoId(null);
  }
};
```

A chave é o `window.open('about:blank')` **antes do primeiro await** — sem isso, navegadores como Firefox bloqueiam o pop-up porque o `open` aconteceu fora do gesto direto.

---

#### 10.8 — `PassengerForm.tsx`

`inferirRouteType` foi removido. Agora o turno do passageiro vem direto de `rota.turno` quando seleciona uma rota:

```ts
setForm(f => ({ ...f, rotaId: id, routes: r ? [r.turno] : f.routes }));
```

---

#### Bugs/edge-cases tratados na Fase 10

| Caso | Tratamento |
|---|---|
| Motorista renomeia rota para nome arbitrário | `turno` separado do `nome` mantém cor/ícone consistentes |
| Hard delete de rota ativa | Substituído por soft delete (`status='inativa'`) — preserva histórico |
| Reordenar paradas viola UNIQUE | Estratégia em 2 passos (offset 1000) |
| Pop-up do Maps bloqueado | `window.open('about:blank')` síncrono + `location.href` após await |
| Rota sem ponto_saida ou sem paradas | URL retorna null, modal informa o motorista, viagem inicia normalmente |
| Passageiros antigos sem `paradas_rota` | Backfill SQL cria automaticamente preservando `ordem_na_rota` |
| Layout fixo de 3 rotas no Dashboard | Grid responsivo `repeat(N, 1fr)` para qualquer quantidade |

---

### Fase 11: Refinos pós-roteiro flexível (30/04/2026)

Esta fase reúne os ajustes feitos depois da Fase 10 com base no uso real: o modelo de "blocos editáveis" foi simplificado, o ponto de saída ganhou estrutura, vários bugs de timing foram corrigidos e o fluxo de iniciar viagem ganhou validação.

---

#### 11.1 — Endereço estruturado do ponto de saída

**Migration:** `supabase/migrations/20260430010000_endereco_estruturado.sql`

A coluna `ponto_saida` (string livre) foi substituída por 4 colunas estruturadas em `rotas`:

- `ponto_saida_rua` (text)
- `ponto_saida_numero` (text — suporta "123A", "S/N")
- `ponto_saida_bairro` (text)
- `ponto_saida_cep` (text — com ou sem hífen)

Backfill: registros antigos com `ponto_saida` preenchido têm o conteúdo copiado para `ponto_saida_rua` (aproximação). Depois a coluna antiga é dropada.

**Helper novo em `utils/maps.ts`:**

```ts
formatarEnderecoCompleto({ rua, numero, bairro, cep }) → string
// Concatena no formato: "Rua X, 123, Bairro Y, 01310-100"
// Aceita campos vazios — usa só os que estiverem preenchidos.
```

**UI no modal:** os 4 inputs ficam empilhados (Rua em linha cheia, Número + Bairro lado a lado em grid `1fr 1.4fr`, CEP em linha cheia), com o mesmo padrão visual. A função `formatarEnderecoCompleto` é chamada na hora de montar a URL do Google Maps — o banco mantém os campos separados, o Maps recebe a string já concatenada.

**Tipos:** `RotaRow.ponto_saida_*` substitui o antigo `ponto_saida`.

---

#### 11.2 — Race condition na primeira hidratação

**Sintoma reportado**: ao criar uma conta nova, as 3 rotas padrão não apareciam na home — só aparecendo após trocar de aba e voltar.

**Causa raiz**: `DashboardScreen` e `usePassengers` faziam fetch dentro de `useEffect(() => {...}, [])` — disparado **uma única vez no mount**, antes da sessão estar completamente hidratada. As queries chegavam ao Supabase sem JWT pronto, retornavam vazio, e o componente nunca re-buscava. Trocar de aba disparava `onAuthStateChange` (visibility) e algum mecanismo interno revalidava — daí "magicamente" aparecia.

**Fix**: trocar a dependência do `useEffect` para `[motoristaId]`. Quando o auth completa e `motoristaId` muda de `null` → id real, a query é refeita automaticamente.

```ts
// DashboardScreen.tsx + usePassengers.ts
useEffect(() => {
  if (!motoristaId) return;  // guarda contra primeira execução sem auth
  let ativo = true;
  // ... fetch
}, [motoristaId]);
```

`usePassengers` agora importa `useAuth` para acessar o `motoristaId`.

---

#### 11.3 — Substituição do modelo `paradas_rota` por destinos JSONB

**Migration:** `supabase/migrations/20260430020000_destinos_em_rotas.sql`

O modelo de "blocos editáveis intercalados" da Fase 10 foi substituído por um modelo mais simples e direto:

```sql
alter table rotas add column destinos jsonb not null default '[]';
drop table paradas_rota cascade;
```

Cada item do array `destinos`:

```ts
{
  rotulo: "Faculdade Brasil",
  rua: "Av. Paulista", numero: "1500",
  bairro: "Bela Vista",  cep: "01310-100"
}
```

**Trade-off vs Fase 10**: perde-se a possibilidade de intercalar destinos entre passageiros (ex: "Renato → Lucas → Faculdade A → Marcelo → Faculdade B"). O novo modelo assume sequência fixa: motorista pega TODOS os passageiros, depois entrega nos destinos em ordem.

Foi escolhido pela usabilidade — drag-and-drop intercalado tinha UX ruim no mobile e poucos casos reais usavam intercalação.

**Aba "Roteiro" REMOVIDA do modal**. O modal agora tem uma única view "Dados da Rota" com:
- Nome, Turno, Horário
- Ponto de saída (4 campos)
- **Seção "Destinos finais"**: lista de cards (`DestinoCard`) com rótulo + 4 campos de endereço + botão de remover
- Botão `+ Adicionar destino`

**`paradaRotaService.ts` foi DELETADO**. Substituído por:
- `listarPassageirosDaRota(rotaId)` em `passageiroService.ts` — retorna apenas os endereços de embarque ordenados por `ordem_na_rota`, usados como waypoints

**Tipos:** `DestinoRota` adicionado, `ParadaRotaRow`/`TipoParada` removidos.

---

#### 11.4 — Botão Play: nova lógica de montar a URL do Maps

`handleIniciarViagem` no Dashboard agora:

1. Busca `obterRota(rotaId)` (com destinos) e `listarPassageirosDaRota(rotaId)` em paralelo
2. **origem** = ponto de saída (formatado dos 4 campos)
3. **paradas** = endereços de passageiros (ordem_na_rota) seguidos dos endereços de destinos (ordem cadastrada)
4. **optimize** = `true` apenas quando há 0 ou 1 destino (Google reordena os waypoints, que são todos passageiros). Com 2+ destinos, `optimize: false` para preservar a ordem ("primeiro Faculdade A, depois B")

**`utils/maps.ts`** ganhou parâmetro `{ optimize?: boolean }` em `montarUrlGoogleMaps`. Quando `true`, prefixa os waypoints com `optimize:true|`.

---

#### 11.5 — Validação antes de iniciar viagem

Nova função em `rotaService.ts`:

```ts
validarRotaParaInicio(rotaId): Promise<{ valido: boolean; erro?: string }>
```

Verifica em ordem (retorna na primeira falha):

| Cenário | Mensagem ao motorista |
|---|---|
| Sem ponto de saída (rua vazia) | "Configure o ponto de saída da van antes de iniciar. Clique em 'Gerenciar Rotas' para editar." |
| Sem destino final cadastrado | "Adicione pelo menos um destino final na rota. Clique em 'Gerenciar Rotas' para editar." |
| Sem passageiros ativos | "Nenhum passageiro cadastrado nesta rota. Adicione passageiros antes de iniciar a viagem." |

`handleIniciarViagem` chama essa função **antes** do `window.open` — se inválido, exibe `toast.error()` e aborta sem abrir aba inútil. O `window.open('about:blank')` só roda após validação, dentro da janela de tolerância de pop-up blocker (a validação é uma única query rápida).

---

#### 11.6 — Bug: rotas padrão não criadas em registro novo

**Sintoma**: ao registrar um novo motorista, as 3 rotas padrão (Manhã/Tarde/Noite) não eram inseridas no banco. Erro intermitente "Edge Function returned a non-2xx status code" aparecia.

**Causa raiz suspeita**: `criarRotasPadrao` era chamado **no client** logo após `signUp`. O Supabase JS pode não ter persistido a session interna ainda → o `INSERT` em `rotas` chegava ao PostgREST como `anon` → bloqueado pela RLS. O `console.error` registrava, mas o código retornava `void` e o erro era invisível ao caller.

**Fix em duas camadas:**

**1. Edge Function `criar-perfil-motorista` agora cria as rotas no mesmo request:**

```ts
// supabase/functions/criar-perfil-motorista/index.ts
// Após criar motorista + chamar criar_dados_iniciais_motorista:
if (!rotasExistentes || rotasExistentes.length === 0) {
  const padroes = [
    { motorista_id, nome: 'Rota Manhã', horario_saida: '07:00', turno: 'morning',   status: 'ativa' },
    { motorista_id, nome: 'Rota Tarde', horario_saida: '12:00', turno: 'afternoon', status: 'ativa' },
    { motorista_id, nome: 'Rota Noite', horario_saida: '17:30', turno: 'night',     status: 'ativa' },
  ];
  await supabase.from('rotas').insert(padroes).select('id');
}
```

Vantagens:
- Roda no servidor com JWT validado → sem race condition
- Atômico com a criação do motorista
- Erro aparece no log da Edge Function (visível)

A resposta inclui `rotas_criadas: number` e, em caso de erro parcial, `aviso: string`.

**2. `criarRotasPadrao` no client virou fallback idempotente:**

A função agora retorna estado explícito em vez de `void`:

```ts
interface CriarRotasPadraoResult {
  status: 'ja_existiam' | 'criadas' | 'erro';
  totalCriadas?: number;
  erro?: string;
}
```

Se já existem rotas (Edge Function já criou), retorna `'ja_existiam'`. Se a Edge Function for de versão antiga (sem a feature de rotas) ou falhou parcialmente, o client tenta criar — agora sem perder o erro.

**3. Logs detalhados em todo o fluxo de auth:**

Em `register`:
```
[register] iniciando registro { email, nome }
[register] signUp OK { userId, temSession }
[register] sem session — confirmação de email pendente   (caminho A)
[register] chamando Edge Function criar-perfil-motorista (caminho B)
[register] Edge Function retornou: { motorista, rotas_criadas, ... }
[register] fallback criarRotasPadrao para motorista <id>
[register] criarRotasPadrao resultado: { status: 'ja_existiam' }
[register] hidratando sessão...
[register] concluído com sucesso
```

Em `hidratarSessao`:
```
[hidratarSessao] motorista não existe — chamando Edge Function
[hidratarSessao] Edge Function retornou: ...
[hidratarSessao] motorista recém-criado — fallback criarRotasPadrao para <id>
[hidratarSessao] criarRotasPadrao resultado: ...
```

Permite ao desenvolvedor reproduzir o problema localmente e ver exatamente onde o fluxo falha.

> ⚠️ **Importante**: a versão atualizada da Edge Function precisa ser deployada no Supabase (`supabase functions deploy criar-perfil-motorista`) para o fix #1 ter efeito. Enquanto isso, o fallback do client cobre.

---

#### Bugs/edge-cases tratados na Fase 11

| Caso | Tratamento |
|---|---|
| Endereço como string solta dificultava edição | Decomposto em 4 colunas estruturadas |
| Rotas só apareciam após trocar de aba (race condition) | `useEffect` depende de `motoristaId` |
| Modelo `paradas_rota` complexo demais para uso real | Substituído por `destinos jsonb`, aba Roteiro removida |
| `optimize:true` reordenava destinos sequenciais | Aplicado só quando ≤1 destino; ordem preservada com 2+ |
| Play sem validação abria Maps com URL quebrada | `validarRotaParaInicio` com mensagens específicas em PT-BR |
| Rotas padrão não criadas em signup | Movido para Edge Function (servidor) + fallback no client |
| `criarRotasPadrao` falhava silenciosamente | Retorna `CriarRotasPadraoResult` com status explícito |
| Diagnóstico de problemas de auth difícil sem logs | Logs `[register]` e `[hidratarSessao]` em todas as etapas |

---

## O que NÃO existe (ainda)

- **WhatsApp real** — a integração com bot ainda é simulada (sem Twilio, Meta API, Evolution API)
- **Testes de integração / E2E** — existem testes unitários (Vitest), mas sem testes end-to-end (Playwright, Cypress)
- **Deploy** — sem CI/CD configurado, sem service worker completo, sem manifest PWA
- **Internacionalização** — strings hardcoded em PT-BR
- **Notificações push reais** — apenas UI
- **Tela de Viagem em andamento** — hook `useIniciarViagem` existe, rota `/viagem/:id` a implementar
