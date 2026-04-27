# Backend SmartRoutes — Edge Functions

Backend serverless do SmartRoutes em Supabase Edge Functions (Deno + TypeScript). Toda a lógica que toca a Evolution API roda aqui — credenciais nunca chegam ao frontend.

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
    │   ├── evolution.ts     → cliente HTTP Evolution API
    │   ├── responses.ts     → helpers ok/erroCliente/erroServidor
    │   └── viagem.ts        → processarIniciarViagem (reusado)
    ├── criar-perfil-motorista/
    ├── iniciar-viagem/
    ├── finalizar-viagem/
    ├── webhook-evolution/
    ├── enviar-mensagem/
    ├── reenviar-confirmacao/
    └── automacao-diaria/
```

## Pré-requisitos

- Node 18+
- Conta no Supabase ([app.supabase.com](https://app.supabase.com)) com um projeto criado
- Docker Desktop rodando (apenas para desenvolvimento local com `supabase start`)
- Instância da Evolution API rodando (ex: Railway), com nome de instância criado e QR code escaneado
- Supabase CLI: já instalado como devDependency (`npx supabase ...`)

## Setup inicial

### 1. Login no Supabase CLI

```bash
npx supabase login
```

### 2. Vincular o projeto local ao projeto remoto

```bash
npx supabase link --project-ref SEU_PROJECT_REF
```

`SEU_PROJECT_REF` está em `Settings > General` no dashboard do Supabase.

### 3. Aplicar a migração SQL

```bash
npx supabase db push
```

Isso cria todas as tabelas, ENUMs, índices, triggers, políticas RLS, habilita Realtime e cria a função `criar_dados_iniciais_motorista()`.

### 4. Configurar secrets

Copie o template e preencha com valores reais:

```bash
cp supabase/.env.example supabase/.env
# Edite supabase/.env com EVOLUTION_API_URL, EVOLUTION_API_KEY, ...
```

Envie para o projeto remoto:

```bash
npx supabase secrets set --env-file supabase/.env
```

> As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente — não precisa configurar.

### 5. Deploy de todas as funções

```bash
npx supabase functions deploy criar-perfil-motorista
npx supabase functions deploy iniciar-viagem
npx supabase functions deploy finalizar-viagem
npx supabase functions deploy webhook-evolution --no-verify-jwt
npx supabase functions deploy enviar-mensagem
npx supabase functions deploy reenviar-confirmacao
npx supabase functions deploy automacao-diaria --no-verify-jwt
```

> `--no-verify-jwt` em `webhook-evolution` e `automacao-diaria` porque elas validam por header próprio (`x-webhook-secret` / `x-cron-secret`), não por JWT do Supabase Auth.

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

### 7. Configurar cron job (no SQL Editor do Supabase)

```sql
select cron.schedule(
  'automacao-diaria-smartroute',
  '*/15 * * * *',  -- a cada 15 minutos; a função filtra pelo horário configurado de cada motorista
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

## Desenvolvimento local

```bash
npx supabase start                                   # sobe Postgres, Auth, Studio etc.
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
| `WEBHOOK_SECRET` | `.env` | Segredo do webhook da Evolution |
| `CRON_SECRET` | `.env` | Segredo do cron job |

---

## Como testar cada função

> Substitua `<PROJECT>` pela ref do projeto e `<JWT>` pelo token de um usuário autenticado (obtido no frontend via `supabase.auth.getSession()` ou no Studio em `Authentication > Users > Select user > JWT`).

### 1. `criar-perfil-motorista`

Cria o motorista logo após o primeiro login.

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/criar-perfil-motorista" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João da Silva",
    "telefone": "5519999999999",
    "cnh": "12345678901"
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

Cria a viagem do dia e dispara `sendList` para cada passageiro ativo.

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

### 7. `automacao-diaria`

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
| `PASSAGEIRO_NAO_ENCONTRADO` | 403/404 | Passageiro inexistente, inativo ou de outro motorista |
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

- [ ] Migração aplicada (`supabase db push`)
- [ ] Secrets configurados (`supabase secrets list`)
- [ ] 7 funções deployadas (`supabase functions list`)
- [ ] Webhook da Evolution API apontando para `webhook-evolution`
- [ ] Cron job criado no SQL Editor
- [ ] Realtime habilitado em `confirmacoes`, `viagens`, `instancias_whatsapp`
- [ ] Frontend usando `supabase.functions.invoke()` em vez de `mockData`

## Dicas de troubleshooting

- **`401 NAO_AUTORIZADO`** → JWT expirado. Faça login novamente no frontend.
- **`MOTORISTA_NAO_ENCONTRADO` após cadastro** → Chame `criar-perfil-motorista` antes de qualquer outra função.
- **Mensagens não chegam** → Verifique `evolutionVerificarConexao` e o status da instância no painel da Evolution API.
- **Webhook não dispara** → Confira que `webhook_by_events: true` foi setado e que `events` inclui `MESSAGES_UPSERT`.
- **Logs em produção:** `npx supabase functions logs <nome> --tail`
