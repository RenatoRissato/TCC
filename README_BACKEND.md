# Backend SmartRoutes — Edge Functions

![Deno](https://img.shields.io/badge/runtime-Deno-000000?logo=deno&logoColor=white)
![Supabase](https://img.shields.io/badge/platform-Supabase-3FCF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178C6?logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/status-funcional-success)

> Backend serverless do SmartRoutes em **Supabase Edge Functions** (Deno + TypeScript). Toda a lógica que toca a Evolution API roda aqui — **credenciais nunca chegam ao frontend**.

📖 Veja também: [`README.md`](../README.md) (documentação geral do projeto)

---

## Sumário

- [Estrutura](#estrutura)
- [Papel de cada função](#papel-de-cada-função)
- [Pré-requisitos](#pré-requisitos)
- [Setup inicial](#setup-inicial)
- [Desenvolvimento local](#desenvolvimento-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como testar cada função](#como-testar-cada-função)
- [Códigos de erro padronizados](#códigos-de-erro-padronizados)
- [Checklist pós-deploy](#checklist-pós-deploy)
- [Troubleshooting](#troubleshooting)

---

## Estrutura

```
supabase/
├── config.toml
├── .env.example
├── migrations/
│   └── 20260427000000_initial_schema.sql
└── functions/
    ├── deno.json
    ├── import_map.json
    ├── _shared/
    │   ├── auth.ts          → getMotorista(req), criarClienteServico()
    │   ├── cors.ts          → corsHeaders + handlePreflight
    │   ├── evolution.ts     → cliente HTTP da Evolution API
    │   ├── responses.ts     → helpers ok / erroCliente / erroServidor
    │   └── viagem.ts        → processarIniciarViagem (reutilizado)
    ├── criar-perfil-motorista/
    ├── iniciar-viagem/
    ├── finalizar-viagem/
    ├── webhook-evolution/
    ├── enviar-mensagem/
    ├── reenviar-confirmacao/
    ├── otimizar-sequencia-passageiros/
    └── automacao-diaria/
```

**8 Edge Functions** ao todo — 6 acionadas pelo frontend autenticado, 1 acionada pelo cron job e 1 acionada pela Evolution API (webhook).

---

## Papel de cada função

| Função | Acionada por | O que faz |
|---|---|---|
| `criar-perfil-motorista` | Frontend (1º login) | Cria o perfil do motorista após o cadastro inicial. Idempotente. |
| `iniciar-viagem` | Frontend / cron | Cria a viagem do dia para uma rota e dispara mensagens de confirmação para cada passageiro ativo via Evolution API. |
| `finalizar-viagem` | Frontend | Marca confirmações pendentes como ausentes, finaliza a viagem e popula o histórico via trigger. |
| `webhook-evolution` | Evolution API | Recebe respostas dos responsáveis pelo WhatsApp, processa a confirmação (`1` = ida e volta, `2` = só ida, etc.) e atualiza o banco. |
| `enviar-mensagem` | Frontend | Envia mensagem avulsa para um passageiro específico (ex: "Estou chegando em 5 minutos"). |
| `reenviar-confirmacao` | Frontend | Reenvia a pergunta de confirmação para uma confirmação ainda pendente. |
| `otimizar-sequencia-passageiros` | Frontend | Calcula a melhor sequência de paradas usando Google Routes API com fallback automático para OpenStreetMap/OSRM. |
| `automacao-diaria` | Cron job (`pg_cron`) | Roda a cada 1 minuto. Quando o horário configurado pelo motorista bate, dispara `iniciar-viagem` automaticamente. Também reenvia mensagens para confirmações pendentes da viagem corrente. |

> **Por que duas funções não usam JWT do Supabase Auth?** `webhook-evolution` e `automacao-diaria` validam suas próprias requisições via cabeçalhos `x-webhook-secret` e `x-cron-secret`, respectivamente. Isso permite que sistemas externos (Evolution API e o cron) as chamem sem precisar de um usuário autenticado.

---

## Pré-requisitos

- Node 18+
- Conta no Supabase ([app.supabase.com](https://app.supabase.com)) com um projeto criado
- Docker Desktop rodando (apenas para desenvolvimento local com `supabase start`)
- Instância da Evolution API rodando (ex: Railway), com nome de instância criado e QR code escaneado
- Supabase CLI: já instalado como devDependency (`npx supabase ...`)

---

## Setup inicial

### 1. Login no Supabase CLI

```bash
npx supabase login
```

### 2. Vincular o projeto local ao projeto remoto

```bash
npx supabase link --project-ref SEU_PROJECT_REF
```

`SEU_PROJECT_REF` está em **Settings → General** no dashboard do Supabase.

### 3. Aplicar as migrações SQL

```bash
npx supabase db push
```

Isso cria todas as tabelas, ENUMs, índices, triggers, políticas RLS, habilita Realtime e cria a função `criar_dados_iniciais_motorista()`.

### 4. Configurar secrets

Copie o template e preencha com valores reais:

```bash
cp supabase/.env.example supabase/.env
# Edite supabase/.env com EVOLUTION_API_URL, EVOLUTION_API_KEY, GOOGLE_MAPS_API_KEY, etc.
```

Exemplo de `supabase/.env`:

```env
# --- Supabase ---
# Em LOCAL (supabase start), o CLI injeta automaticamente.
# Em PRODUÇÃO, NÃO definir manualmente — o runtime injeta.
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=

# --- Evolution API (WhatsApp) ---
EVOLUTION_API_URL=https://sua-evolution-api.up.railway.app
EVOLUTION_API_KEY=sua_chave_evolution
EVOLUTION_INSTANCE_NAME=smartroute

# --- Google Routes API (opcional) ---
# Sem essa chave, o sistema usa fallback OpenStreetMap/OSRM
GOOGLE_MAPS_API_KEY=sua_chave_google_routes

# --- Segurança ---
# Use strings aleatórias longas (>= 32 chars).
# Geração sugerida: openssl rand -hex 32
WEBHOOK_SECRET=string_aleatoria_de_32_caracteres_ou_mais
CRON_SECRET=outra_string_aleatoria_de_32_caracteres_ou_mais

# --- Frontend e diagnóstico ---
APP_ORIGIN=https://seu-frontend.vercel.app
DEBUG_LOGS=false
DEBUG_ERRORS=false
```

Envie para o projeto remoto:

```bash
npx supabase secrets set --env-file supabase/.env
```

> As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pelo runtime — não precisa configurar.

### 5. Deploy de todas as funções

```bash
npx supabase functions deploy criar-perfil-motorista
npx supabase functions deploy iniciar-viagem
npx supabase functions deploy finalizar-viagem
npx supabase functions deploy webhook-evolution --no-verify-jwt
npx supabase functions deploy enviar-mensagem
npx supabase functions deploy reenviar-confirmacao
npx supabase functions deploy otimizar-sequencia-passageiros
npx supabase functions deploy automacao-diaria --no-verify-jwt
```

> `--no-verify-jwt` em `webhook-evolution` e `automacao-diaria` porque elas validam por cabeçalho próprio (`x-webhook-secret` / `x-cron-secret`), não por JWT do Supabase Auth.

### 6. Configurar webhook na Evolution API

Uma única chamada para registrar a URL do webhook:

```bash
curl -X POST "$EVOLUTION_API_URL/webhook/set/$EVOLUTION_INSTANCE_NAME" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://SEU_PROJECT_REF.supabase.co/functions/v1/webhook-evolution",
    "webhook_by_events": true,
    "webhook_base64": false,
    "events": ["MESSAGES_UPSERT"],
    "headers": { "x-webhook-secret": "SEU_WEBHOOK_SECRET" }
  }'
```

### 7. Configurar o cron job

A Edge Function `automacao-diaria` deve rodar **a cada 1 minuto**, porque faz comparação exata de `hora:minuto` em `America/Sao_Paulo` para:

- disparar mensagens quando o horário configurado do motorista bate exatamente;
- reaproveitar a viagem do dia para reenviar apenas às confirmações pendentes, sem converter pendentes em ausentes por horário.

As confirmações valem para a viagem corrente. No dia seguinte, uma nova viagem recria todas as confirmações como `pendente`, reiniciando o ciclo naturalmente.

> ⚠️ **Nota sobre o nome do arquivo de migration:** o projeto contém o arquivo `supabase/migrations/20260509010000_cron_automacao_diaria_5min.sql`. Apesar do nome incluir "5min" (resquício histórico), **a configuração operacional atual do projeto é 1 minuto**. Não confie no nome do arquivo — confie no schedule abaixo.

**Para não versionar segredo**, salve o `CRON_SECRET` no Supabase Vault antes de rodar as migrations:

```sql
select vault.create_secret('SEU_CRON_SECRET', 'smartroutes_cron_secret');
```

Se a migration legada já tiver sido aplicada sem o secret no Vault, rode uma vez o helper existente:

```sql
select public.configurar_cron_automacao_diaria_5min('SEU_CRON_SECRET');
```

Ou recrie manualmente o job com schedule de 1 minuto:

```sql
select cron.schedule(
  'automacao-diaria-smartroute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/automacao-diaria',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'SEU_CRON_SECRET'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

---

## Desenvolvimento local

```bash
npx supabase start                                     # sobe Postgres, Auth, Studio etc.
npx supabase functions serve --env-file supabase/.env  # roda as Edge Functions localmente
```

URL local das funções: `http://localhost:54321/functions/v1/<nome>`.

---

## Variáveis de ambiente

| Variável | Origem | Descrição |
|---|---|---|
| `SUPABASE_URL` | Auto | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Auto | Chave pública anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Chave service role (bypass RLS) |
| `EVOLUTION_API_URL` | `.env` | URL base da Evolution API |
| `EVOLUTION_API_KEY` | `.env` | API key da Evolution |
| `EVOLUTION_INSTANCE_NAME` | `.env` | Nome da instância (ex: `smartroute`) |
| `GOOGLE_MAPS_API_KEY` | `.env` | Chave secreta da Google Routes API para otimização de sequência |
| `WEBHOOK_SECRET` | `.env` | Segredo do webhook da Evolution |
| `CRON_SECRET` | `.env` | Segredo do cron job |
| `APP_ORIGIN` | `.env` | URL do frontend autorizada no CORS em produção |
| `DEBUG_LOGS` | `.env` | Habilita logs detalhados apenas para diagnóstico local |
| `DEBUG_ERRORS` | `.env` | Retorna detalhes técnicos em erro 500 apenas para diagnóstico local |

> **Privacidade da otimização:** a Edge Function `otimizar-sequencia-passageiros` envia endereços de origem, destino e embarque para a Google Routes API quando `GOOGLE_MAPS_API_KEY` está configurada. Sem essa chave, o fallback consulta OpenStreetMap/Nominatim e OSRM. Em produção, informe isso nos termos de uso ou política de privacidade.

---

## Como testar cada função

> Substitua `<PROJECT>` pela ref do projeto e `<JWT>` pelo token de um usuário autenticado (obtido no frontend via `supabase.auth.getSession()` ou no Studio em **Authentication → Users → Select user → JWT**).

### 1. `criar-perfil-motorista`

Cria o motorista logo após o primeiro login.

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/criar-perfil-motorista" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João da Silva",
    "telefone": "5519999999999",
    "placa_van": "ABC-1234",
    "marca_van": "Mercedes-Benz",
    "modelo_van": "Sprinter",
    "ano_van": 2020
  }'
```

**Resposta esperada (201):**
```json
{
  "motorista": { "id": "uuid", "nome": "João da Silva", "email": "...", ... },
  "criado": true
}
```

Reexecutar retorna `200` com `criado: false` (idempotente).

### 2. `iniciar-viagem`

Cria a viagem do dia e dispara `sendText` para cada passageiro ativo.

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/iniciar-viagem" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "rota_id": "uuid-da-rota" }'
```

**Resposta esperada (201 ou 200):**
```json
{
  "viagem_id": "uuid",
  "total_passageiros": 8,
  "mensagens_enviadas": 7,
  "mensagens_com_falha": 1,
  "resultados": [
    { "passageiro_id": "uuid", "nome": "Ana", "sucesso": true },
    { "passageiro_id": "uuid", "nome": "João", "sucesso": false, "erro": "..." }
  ],
  "ja_existia": false
}
```

**Erros possíveis:** `403 ROTA_NAO_ENCONTRADA`, `404 PASSAGEIRO_NAO_ENCONTRADO`.

### 3. `finalizar-viagem`

Marca pendentes como ausentes, finaliza a viagem (trigger popula histórico).

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/finalizar-viagem" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "viagem_id": "uuid-da-viagem" }'
```

**Resposta:**
```json
{
  "viagem_id": "uuid",
  "finalizadaEm": "2026-04-27T18:00:00.000Z",
  "ausentes_marcados": 2
}
```

### 4. `webhook-evolution`

Recebido pela Evolution API (você normalmente não chama manualmente). Para testar localmente, simule:

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/webhook-evolution" \
  -H "x-webhook-secret: SEU_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "smartroute",
    "data": {
      "key": {
        "remoteJid": "5519999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "ABCD1234"
      },
      "pushName": "Maria",
      "message": {
        "listResponseMessage": {
          "title": "Ida e volta",
          "singleSelectReply": { "selectedRowId": "1_UUID-DA-CONFIRMACAO" }
        }
      },
      "messageType": "listResponseMessage"
    }
  }'
```

**Resposta:**
```json
{
  "sucesso": true,
  "confirmacao_id": "uuid",
  "status": "confirmado",
  "tipo": "ida_e_volta"
}
```

Sem o header `x-webhook-secret` correto: `401 WEBHOOK_INVALIDO`.

### 5. `enviar-mensagem`

Mensagem avulsa para um passageiro.

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/enviar-mensagem" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "passageiro_id": "uuid",
    "mensagem": "Estou chegando em 5 minutos"
  }'
```

**Resposta:**
```json
{ "sucesso": true, "passageiro": "Ana Clara", "telefone": "5519999999999" }
```

Se a instância estiver desconectada: `503 WHATSAPP_DESCONECTADO`.

### 6. `reenviar-confirmacao`

Reenvia para uma confirmação ainda pendente.

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/reenviar-confirmacao" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "confirmacao_id": "uuid" }'
```

**Resposta:**
```json
{ "sucesso": true, "confirmacao_id": "uuid", "tentativa": 2 }
```

Se a confirmação já tiver sido respondida: `409 CONFIRMACAO_JA_RESPONDIDA`.

### 7. `otimizar-sequencia-passageiros`

Calcula a melhor sequência de paradas usando Google Routes API ou fallback OpenStreetMap/OSRM.

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/otimizar-sequencia-passageiros" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "rota_id": "uuid-da-rota" }'
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "provider": "google_routes",
  "sequencia": [
    { "passageiro_id": "uuid", "ordem": 1, "nome": "Ana" },
    { "passageiro_id": "uuid", "ordem": 2, "nome": "João" }
  ]
}
```

> Quando `GOOGLE_MAPS_API_KEY` não está configurada, `provider` retorna `osrm_fallback`.

### 8. `automacao-diaria`

Cron job — também testável manualmente.

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/automacao-diaria" \
  -H "x-cron-secret: SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "ignorar_horario": true }'
```

> `ignorar_horario: true` ignora a janela de tolerância (útil para testes manuais). Em produção, use `{}`.

**Resposta:**
```json
{
  "processados": 1,
  "com_erro": 0,
  "detalhes": [
    { "motorista_id": "uuid", "rotas_iniciadas": 2, "erros": [] }
  ]
}
```

---

## Códigos de erro padronizados

| Código | Status HTTP | Quando ocorre |
|---|---|---|
| `NAO_AUTORIZADO` | 401 | JWT inválido ou ausente |
| `MOTORISTA_NAO_ENCONTRADO` | 404 | Usuário sem perfil de motorista |
| `ROTA_NAO_ENCONTRADA` | 403 | Rota inexistente ou de outro motorista |
| `PASSAGEIRO_NAO_ENCONTRADO` | 403/404 | Passageiro inexistente, removido ou de outro motorista |
| `VIAGEM_NAO_ENCONTRADA` | 403 | Viagem inexistente ou de outro motorista |
| `VIAGEM_JA_FINALIZADA` | 409 | Tentativa de finalizar viagem já finalizada |
| `CONFIRMACAO_NAO_ENCONTRADA` | 403/404 | Confirmação inexistente ou inacessível |
| `CONFIRMACAO_JA_RESPONDIDA` | 409 | Reenvio para confirmação fora de `pendente` |
| `WHATSAPP_DESCONECTADO` | 503 | Instância da Evolution API não está em `open` |
| `WEBHOOK_INVALIDO` | 401 | Secret do webhook não confere |
| `CRON_INVALIDO` | 401 | Secret do cron não confere |
| `BODY_INVALIDO` | 400 | JSON do body malformado |
| `METODO_INVALIDO` | 400 | Método HTTP diferente de POST |

---

## Checklist pós-deploy

- [ ] Migração aplicada (`npx supabase db push`)
- [ ] Secrets configurados (`npx supabase secrets list`)
- [ ] **8 funções** deployadas (`npx supabase functions list`)
- [ ] Webhook da Evolution API apontando para `webhook-evolution`
- [ ] Cron job criado no SQL Editor (schedule **a cada 1 minuto**)
- [ ] `CRON_SECRET` salvo no Supabase Vault
- [ ] Realtime habilitado em `confirmacoes`, `viagens`, `instancias_whatsapp`
- [ ] Frontend ligado aos dados reais (tela WhatsApp e configurações)
- [ ] Instância da Evolution API conectada (status `open`, QR Code escaneado)

---

## Troubleshooting

| Sintoma | Possível causa | Como resolver |
|---|---|---|
| `401 NAO_AUTORIZADO` | JWT expirado | Faça login novamente no frontend |
| `MOTORISTA_NAO_ENCONTRADO` após cadastro | `criar-perfil-motorista` não foi chamado | Chame essa função antes de qualquer outra |
| Mensagens não chegam | Instância desconectada | Verifique `evolutionVerificarConexao` e o status da instância no painel da Evolution API |
| Webhook não dispara | Configuração da Evolution incorreta | Confira que `webhook_by_events: true` foi setado e que `events` inclui `MESSAGES_UPSERT` |
| Cron não executa | Vault sem o secret ou schedule errado | Verifique `select * from cron.job;` e confirme schedule `* * * * *` |
| Erros 500 sem detalhe | Logs desabilitados | Em produção, use `npx supabase functions logs <nome> --tail` |

### Comandos úteis

```bash
# Logs em tempo real de uma função
npx supabase functions logs webhook-evolution --tail

# Listar todas as funções deployadas
npx supabase functions list

# Listar secrets configurados
npx supabase secrets list

# Ver status do cron job
psql "$DATABASE_URL" -c "select * from cron.job;"
```

---

## Boas práticas adotadas

- **Credenciais nunca expostas:** chaves da Evolution API e Google Routes API ficam apenas nas Edge Functions, nunca no frontend
- **Row Level Security (RLS):** cada motorista só acessa seus próprios dados, mesmo se conseguir um JWT válido
- **Service role isolada:** apenas funções que precisam bypassar RLS usam `criarClienteServico()` (ex: webhook que recebe sem JWT)
- **Idempotência:** `criar-perfil-motorista` pode ser chamada várias vezes sem efeito colateral
- **Códigos de erro padronizados:** todos os erros seguem a tabela acima, facilitando o tratamento no frontend
- **Realtime para feedback imediato:** o frontend recebe atualizações via WebSocket sem precisar fazer polling

---

📖 **Documentação geral do projeto:** [`../README.md`](../README.md)