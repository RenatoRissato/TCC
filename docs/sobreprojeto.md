# PROJETO.md — SmartRoute

## O que é o sistema

SmartRoute é um PWA mobile-first para motoristas de vans escolares que automatiza a confirmação de presença dos alunos via WhatsApp e organiza as rotas do dia com base nas respostas recebidas.

O problema central resolvido: motoristas não sabem antecipadamente quais alunos vão usar o transporte, gerando paradas desnecessárias, atrasos e rotas ineficientes. O sistema resolve isso enviando mensagens automáticas para os responsáveis e registrando as respostas automaticamente.

---

## Usuários do sistema

**Motorista** — único tipo de usuário autenticado. Acessa o PWA para gerenciar passageiros, rotas, visualizar a lista diária e acompanhar confirmações em tempo real.

**Responsável pelo aluno** — não tem acesso ao sistema. Interage exclusivamente via WhatsApp, respondendo com um número de 1 a 4.

---

## Fluxo principal

1. Motorista configura seus passageiros e rotas no PWA
2. Sistema envia mensagem automática via WhatsApp para cada responsável no horário configurado
3. Responsável responde com um número:
   - `1` → Ida e volta
   - `2` → Somente ida
   - `3` → Somente volta
   - `4` → Não vai hoje
4. Sistema registra a resposta automaticamente e atualiza o status do aluno
5. Motorista visualiza a lista diária com todos os confirmados, pendentes e ausentes
6. Sistema sugere a rota otimizada com base nos alunos confirmados

---

## Stack tecnológica

### Frontend (já implementado)
- React 18 + TypeScript + Vite 6
- React Router 7 — navegação SPA
- Tailwind CSS v4 + Shadcn/ui — estilo e componentes
- Supabase JS Client — acesso ao banco e autenticação
- Supabase Realtime — atualizações ao vivo das confirmações
- Recharts — gráficos na dashboard
- React Hook Form — formulários
- Sonner — notificações toast
- Vitest + Testing Library — testes

### Backend (a implementar)
- Supabase Edge Functions (Deno + TypeScript) — lógica de negócio segura no servidor
- Supabase PostgreSQL — banco de dados principal do sistema
- Supabase Auth — autenticação dos motoristas
- Supabase Realtime — notificações em tempo real para o frontend
- Evolution API — integração com WhatsApp via protocolo Baileys

### Hospedagem
- Vercel — deploy do frontend PWA
- Railway — Evolution API (processo persistente 24/7)
- Supabase Cloud — banco, auth, Edge Functions e Realtime

---

## Arquitetura de segurança

O frontend **nunca** chama a Evolution API diretamente. Todo acesso à Evolution API passa pelas Edge Functions, que mantêm a API key segura no servidor. O frontend chama apenas o Supabase (banco + Edge Functions) usando o JWT do usuário autenticado.

```
Frontend PWA
    │
    ├── supabase.from('tabela')        → PostgreSQL com RLS
    ├── supabase.functions.invoke()    → Edge Functions (autenticadas via JWT)
    └── supabase.channel()             → Realtime

Edge Functions (servidor)
    ├── Valida JWT do motorista
    ├── Aplica regras de negócio
    ├── Acessa PostgreSQL via service_role
    └── Chama Evolution API (API key protegida)
```

---

## Dois bancos PostgreSQL — importante

O sistema usa dois bancos com responsabilidades distintas:

| Banco | O que armazena | Gerenciado por |
|---|---|---|
| Supabase PostgreSQL | Dados do domínio: motoristas, passageiros, rotas, viagens, confirmações, templates, logs | A aplicação |
| Evolution API PostgreSQL | Sessões WhatsApp, filas internas, estado da conexão Baileys | Internamente pela Evolution API |

O banco da Evolution API é uma dependência técnica da biblioteca, não uma decisão de modelagem do projeto. A aplicação não acessa esse banco diretamente.

---

## Módulos do sistema

### Autenticação
- Login e logout do motorista via Supabase Auth
- Sessão persistente no PWA
- Proteção de todas as rotas autenticadas

### Gestão de passageiros
- CRUD completo: nome, telefone do responsável, endereço de embarque, turno, ordem na rota
- Ativação e inativação de passageiros
- Histórico de presença por aluno

### Gestão de rotas
- CRUD de rotas com nome, descrição e horário de saída
- Associação de passageiros à rota com ordem de embarque
- Status da rota: ativa, inativa

### Lista diária
- Geração automática ao iniciar uma viagem
- Separação em: confirmados, pendentes, ausentes
- Tipos de confirmação: ida e volta, somente ida, somente volta, não vai
- Taxa de ocupação calculada automaticamente
- Atualização em tempo real via Supabase Realtime

### Confirmação de presença
- Registro automático via resposta WhatsApp (números 1 a 4)
- Registro manual pelo motorista no PWA
- Status: pendente, confirmado, ausente
- Canal: whatsapp, manual

### Integração WhatsApp (via Edge Functions)
- Envio automático de mensagens no horário configurado
- Recebimento e processamento de respostas via webhook
- Envio de confirmação de recebimento para o responsável
- Log completo de todas as mensagens enviadas e recebidas

### Templates de mensagem
- Motorista personaliza o texto da mensagem enviada
- Definição de cabeçalho, corpo e rodapé
- Opções numeradas de 1 a 4 configuráveis
- Template padrão disponível

### Automação
- Horário configurável para envio automático das mensagens
- Horário limite para aceitar respostas
- Controle de tentativas de reenvio
- Agendamento via cron na Edge Function

### Histórico e relatórios
- Histórico de presença por data e por aluno
- Frequência calculada por período
- Log de mensagens com status: enviada, entregue, falha

---

## Variáveis de ambiente necessárias

```env
# Supabase — injetadas automaticamente nas Edge Functions
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Evolution API — nunca vão para o frontend
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=

# Segurança do webhook
WEBHOOK_SECRET=
```

---

## O que já está pronto

- Frontend PWA completo com dados mockados em `src/app/data/mockData.ts`
- Camada `src/app/services/` preparada para substituir os mocks por chamadas reais
- Estrutura de telas: Dashboard, Rotas, Passageiros, WhatsApp, Configurações, Login

## O que falta implementar

- Supabase: criação das tabelas com RLS
- Edge Functions: `iniciar-viagem`, `webhook-evolution`, `enviar-mensagem`, `automacao-diaria`
- Integração do frontend: substituir `mockData.ts` pelas chamadas reais ao Supabase
- Configuração do webhook na Evolution API apontando para a Edge Function