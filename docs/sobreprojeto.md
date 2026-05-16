# PROJETO.md — SmartRoutes

## O que é o sistema

SmartRoutes é um PWA mobile-first para motoristas de vans escolares que automatiza a confirmação de presença dos alunos via WhatsApp e organiza as rotas do dia com base nas respostas recebidas.

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
5. Motorista visualiza a lista diária com os 5 estados de UI: ida e volta, somente ida, somente volta, não vai e pendente
6. Motorista escolhe o sentido da viagem ao iniciar a rota, e o Google Maps considera apenas passageiros compatíveis com a direção escolhida

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

### Backend (já implementado na base atual)
- Supabase Edge Functions (Deno + TypeScript) — lógica de negócio segura no servidor
- Supabase PostgreSQL — banco de dados principal do sistema
- Supabase Auth — autenticação real dos motoristas
- Supabase Realtime — atualizações em tempo real no frontend
- Evolution API — integração com WhatsApp via Edge Functions

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
- Cada motorista pode ter mais de uma rota no mesmo turno
- Ao criar conta, o sistema garante 3 rotas padrão iniciais: manhã, tarde e noite

### Lista diária
- Geração automática ao iniciar uma viagem manualmente ou pelo cron
- Separação em: confirmados, pendentes, ausentes
- Tipos de confirmação: ida e volta, somente ida, somente volta, não vai
- Sentido da viagem: `buscar` ou `retorno`
- Taxa de ocupação calculada automaticamente
- Atualização em tempo real via Supabase Realtime

### Confirmação de presença
- Registro automático via resposta WhatsApp (números 1 a 4)
- Registro manual pelo motorista no PWA
- Status: pendente, confirmado, ausente
- Canal: whatsapp, manual
- Mensagens inválidas recebem orientação automática com as opções válidas
- Responsável pode alterar uma confirmação já feita após confirmar a alteração

### Integração WhatsApp (via Edge Functions)
- Envio automático de mensagens no horário configurado
- Recebimento e processamento de respostas via webhook
- Envio de confirmação de recebimento para o responsável
- Log completo de todas as mensagens enviadas e recebidas
- Atualização de status de entrega via evento `MESSAGES_UPDATE` da Evolution API

### Templates de mensagem
- Motorista personaliza o texto da mensagem enviada
- Definição de cabeçalho, corpo e rodapé
- Opções numeradas de 1 a 4 configuráveis
- Template padrão disponível

### Automação
- Horário configurável por rota para envio automático das mensagens
- Controle de tentativas de reenvio
- Reinício diário natural do ciclo de confirmações: cada nova viagem começa com todos em `pendente`
- Agendamento via cron na Edge Function
- Cron só processa instâncias WhatsApp com `status_conexao = 'conectado'`

### Perfil do motorista
- Edição de dados pessoais, WhatsApp e dados da van
- Validação para impedir campos obrigatórios vazios
- Upload de foto de perfil no Supabase Storage (`profile-photos`)
- Sidebar e cabeçalho exibem a foto quando existir

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

# Segurança do webhook (evita chamadas externas falsas)
WEBHOOK_SECRET=

# Segurança do cron (pg_cron passa esse header em cada disparo)
CRON_SECRET=
```

---

## Formato real das mensagens hoje

Confirmação diária e reenvios são enviados via **`sendText` puro** (não
mais `sendList`/lista interativa). O corpo segue o template do motorista
+ variáveis:

```
{saudacao}! Confirmação de presença na van escolar para hoje.

Responda com o número da opção desejada:
1 - Ida e volta
2 - Somente ida
3 - Somente volta
4 - Não vai hoje

Aguardo sua resposta. Obrigado!
```

Variáveis disponíveis no template (substituídas em runtime pela Edge
Function, **não** pelo frontend):

| Variável | Substituída por |
|---|---|
| `{saudacao}` | `Bom dia` / `Boa tarde` / `Boa noite` conforme horário em `America/Sao_Paulo` |
| `{nome_passageiro}` | Nome completo do aluno |
| `{data_formatada}` | Data de hoje em `dd/mm/yyyy` |

O responsável responde com o dígito 1-4 (o webhook aceita variações como
"1", "1 - Ida e volta", "1.", etc.) e o sistema atualiza a confirmação
automaticamente.

---

## O que já está pronto

- Frontend PWA com autenticação real via Supabase Auth
- Camada `src/app/services/` 100% conectada ao Supabase (rotas, passageiros, dashboard, viagens, WhatsApp e configurações)
- Estrutura de telas ativa: Dashboard, Rotas, Passageiros, WhatsApp, Configurações, Login, Cadastro e Viagem em andamento — **todas com persistência real no backend**
- Banco com migrations, RLS, Realtime e Edge Functions versionados no repositório
- **WhatsApp ponta a ponta**: QR Code real, status de conexão sincronizado via webhook, envio automático via cron, reenvio manual e em massa, processamento de respostas via texto puro
- **Cron multi-pass** (`automacao-diaria`): cria viagem nova no horário OU reenvia apenas para confirmações pendentes em chamadas subsequentes
- **Automação por rota**: cada rota pode ter seu próprio horário e toggle de envio na tela WhatsApp
- **Proteção do cron por conexão**: o cron só roda para instâncias WhatsApp conectadas; a UI bloqueia ativação quando desconectado
- **Início manual de rota sem disparo automático**: o botão play cria/abre a viagem, mas não envia WhatsApp; envio fica no cron ou no reenvio manual
- **Direção da viagem**: o motorista escolhe `buscar` ou `retorno`, e a lista do Maps filtra `somente_ida`/`somente_volta` conforme a direção
- Variável `{saudacao}` automática no template
- Status UI unificado: `confirmado + nao_vai` é tratado como "não vai hoje" em todas as telas e no trajeto do Google Maps
- Finalização de viagem preserva confirmações `pendente`; elas só mudam por resposta WhatsApp ou marcação manual
- Histórico em `historico_presenca` populado automaticamente via trigger ao finalizar viagem
- Notificações in-app em tempo real (sino do dashboard) via Realtime
- Foto de perfil do motorista persistida em `motoristas.foto_url` e Storage

## O que ainda falta

- Implementar telas e consultas de **histórico/relatórios** no frontend (os dados já existem em `historico_presenca` e `mensagens`, falta visualização)
- Completar a camada PWA real com manifest, service worker e instalação offline
- Notificações push reais (toggle `notif_push` já persiste; falta FCM/service worker)
- Internacionalização real não existe; o campo `motoristas.idioma` permanece no banco como legado, mas a UI de idioma foi removida
- CI/CD para deploy automático


