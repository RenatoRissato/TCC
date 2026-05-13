# EVOLUTION_API.md — SmartRoutes

## O que é a Evolution API

A Evolution API v2 é uma plataforma brasileira que expõe o WhatsApp como uma API REST. Internamente usa a biblioteca **Baileys** (protocolo direto, sem Puppeteer). Roda em um servidor próprio no Railway com processo persistente 24/7.

A aplicação SmartRoutes **nunca chama a Evolution API diretamente do frontend**. Todas as chamadas passam pelas Edge Functions do Supabase, onde as credenciais ficam protegidas no servidor.

Documentação oficial: https://doc.evolution-api.com/v2/pt/get-started/introduction

---

## Credenciais e configuração

Todas as chamadas à Evolution API precisam de dois dados presentes nas variáveis de ambiente das Edge Functions:

- `EVOLUTION_API_URL` — URL base da instância (ex: `https://smartroute.railway.app`)
- `EVOLUTION_API_KEY` — chave de autenticação passada no header `apikey`
- `EVOLUTION_INSTANCE_NAME` — nome da instância criada na Evolution API (ex: `smartroute`)

O header de autenticação é sempre:
```
apikey: {EVOLUTION_API_KEY}
```

O número de telefone deve ser enviado **com código do país, sem símbolos** (ex: `5519999999999` para Brasil + DDD 19).

---

## Endpoints usados pelo SmartRoutes

### 1. Verificar estado da conexão

Usado antes de enviar mensagens para garantir que o WhatsApp está conectado.

**Endpoint:**
```
GET {EVOLUTION_API_URL}/instance/connectionState/{EVOLUTION_INSTANCE_NAME}
```

**Headers:**
```json
{
  "apikey": "{EVOLUTION_API_KEY}"
}
```

**Resposta 200 — conectado:**
```json
{
  "instance": {
    "instanceName": "smartroute",
    "state": "open"
  }
}
```

**Resposta 200 — desconectado:**
```json
{
  "instance": {
    "instanceName": "smartroute",
    "state": "close"
  }
}
```

**Como usar no código:** A instância está conectada quando `response.instance.state === "open"`. Qualquer outro valor (`close`, `connecting`, `refused`) significa desconectado. Retornar erro `WHATSAPP_DESCONECTADO` para o frontend se não estiver `open`.

---

### 2. Enviar mensagem de texto simples

Usado para enviar a confirmação de recebimento da resposta de volta para o responsável e para mensagens avulsas do motorista.

**Endpoint:**
```
POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE_NAME}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "apikey": "{EVOLUTION_API_KEY}"
}
```

**Body:**
```json
{
  "number": "5519999999999",
  "text": "Confirmado! Ana Clara estará aguardando a van. Bom dia!"
}
```

**Campos obrigatórios:**
- `number` — telefone com código do país, sem espaços ou símbolos
- `text` — texto da mensagem. Suporta formatação WhatsApp: `*negrito*`, `_itálico_`, `~riscado~`

**Resposta 201 — sucesso:**
```json
{
  "key": {
    "remoteJid": "5519999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE594145F4C59B4"
  },
  "message": {
    "extendedTextMessage": {
      "text": "Confirmado! Ana Clara estará aguardando a van. Bom dia!"
    }
  },
  "messageTimestamp": "1717689097",
  "status": "PENDING"
}
```

**Campo importante na resposta:** `key.id` é o ID da mensagem no WhatsApp — salvar na coluna `whatsapp_message_id` da tabela `mensagens` para rastreabilidade.

**Tratamento de erro:** Se a resposta não for 2xx, lançar Error com status e body. Registrar na tabela `mensagens` com `status_envio = 'falha'` e continuar para o próximo passageiro (não interromper o loop).

---

### 3. Enviar confirmação de presença (texto puro)

⚠️ **Histórico importante:** o sistema originalmente usava `POST /message/sendList`
com `rowId` no formato `{numero}_{confirmacao_id}`. Esse endpoint passou a
falhar consistentemente por dois motivos:

1. **Bug do Baileys** — em algumas versões da Evolution v2 o `sendList`
   lança `TypeError: this.isZero is not a function` na hora de serializar.
2. **WhatsApp restringiu** mensagens de lista interativas para APIs
   não-oficiais (não-Business).

**Decisão arquitetural atual:** o SmartRoutes envia a confirmação como
**`sendText` puro** com as 4 opções numeradas no corpo. Texto puro nunca é
bloqueado pelo WhatsApp e funciona em qualquer versão da Evolution.

**Endpoint usado hoje:**
```
POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE_NAME}
```

**Body:**
```json
{
  "number": "5519999999999",
  "text": "Bom dia! Confirmação de presença na van escolar para hoje.\n\nResponda com o número da opção desejada:\n1 - Ida e volta\n2 - Somente ida\n3 - Somente volta\n4 - Não vai hoje\n\nAguardo sua resposta. Obrigado!"
}
```

A montagem do corpo fica em `_shared/viagem.ts::processarIniciarViagem`,
aplicando `{nome_passageiro}`, `{data_formatada}` e `{saudacao}` no
`cabecalho` e `rodape` do template do motorista, e inserindo as opções
ativas (`opcoes_resposta`) entre os dois.

#### Como o responsável responde

O pai recebe o texto e responde diretamente com o número da opção. O regex
do webhook aceita variações:

- `"1"`, `"2"`, `"3"`, `"4"` (estrito)
- `"1 - Ida e volta"`, `"1.", "1 ", "  1  "` (qualquer texto que comece com dígito 1-4)

Veja `webhook-evolution` em [`docs/Edge_Functions.md`](Edge_Functions.md) para
o pipeline completo.

#### Compatibilidade com sendList (legado)

O webhook ainda **aceita** `listResponseMessage` com `rowId` no formato
`{numero}_{confirmacao_id}`. Se a Evolution voltar a suportar listas de
forma estável no futuro, podemos reativar `evolutionEnviarLista` em
`_shared/evolution.ts` (a função continua exportada com payload já
corrigido para Evolution v2 — usa `sections` em vez de `values`).

---

### 4. Configurar webhook

Registra a URL da Edge Function `webhook-evolution` na Evolution API para receber as respostas dos responsáveis. Executado uma única vez após o deploy, ou via chamada da Edge Function `criar-perfil-motorista`.

**Endpoint:**
```
POST {EVOLUTION_API_URL}/webhook/set/{EVOLUTION_INSTANCE_NAME}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "apikey": "{EVOLUTION_API_KEY}"
}
```

**Body:**
```json
{
  "webhook": {
    "enabled": true,
    "url": "https://SEU_PROJECT_ID.supabase.co/functions/v1/webhook-evolution",
    "webhook_by_events": true,
    "webhook_base64": false,
    "events": [
      "MESSAGES_UPSERT",
      "QRCODE_UPDATED",
      "CONNECTION_UPDATE"
    ],
    "headers": {
      "x-webhook-secret": "{WEBHOOK_SECRET}"
    }
  }
}
```

**Campos:**
- `url` — URL da Edge Function que vai receber os eventos
- `webhook_by_events` — `true` para receber apenas os eventos listados em `events`
- `events` — três eventos que o SmartRoutes processa:
  - `MESSAGES_UPSERT` — resposta do responsável (fluxo principal de confirmação)
  - `QRCODE_UPDATED` — novo QR Code emitido (sincroniza `instancias_whatsapp` para `aguardando_qr`)
  - `CONNECTION_UPDATE` — mudança de estado (sincroniza `conectado`, `desconectado`, `numero_conta`, `nome_conta_wa`)
- `headers` — headers customizados enviados em cada chamada do webhook. Usar para passar o `WEBHOOK_SECRET` que a Edge Function vai validar

> A Edge Function `registrar-webhook` faz exatamente essa chamada — é o
> caminho recomendado para (re)registrar o webhook depois de mexer na
> instância no painel da Evolution.

**Resposta 200:**
```json
{
  "webhook": {
    "instanceName": "smartroute",
    "webhook": {
      "enabled": true,
      "url": "https://xxx.supabase.co/functions/v1/webhook-evolution",
      "webhookByEvents": true,
      "webhookBase64": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }
}
```

---

## Payload do webhook — como a Evolution API notifica o sistema

Quando um responsável responde a mensagem de lista, a Evolution API faz um POST na URL do webhook com o seguinte payload:

```json
{
  "event": "messages.upsert",
  "instance": "smartroute",
  "data": {
    "key": {
      "remoteJid": "5519999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "ABCD1234567890"
    },
    "pushName": "Maria (mãe da Ana)",
    "message": {
      "listResponseMessage": {
        "title": "Ida e volta",
        "listType": 1,
        "singleSelectReply": {
          "selectedRowId": "1_uuid-da-confirmacao"
        }
      }
    },
    "messageType": "listResponseMessage",
    "messageTimestamp": 1717781900,
    "instanceId": "abc123",
    "source": "android"
  },
  "destination": "https://xxx.supabase.co/functions/v1/webhook-evolution",
  "date_time": "2024-06-07T15:05:00.000Z",
  "sender": "5519999999999@s.whatsapp.net",
  "server_url": "https://smartroute.railway.app",
  "apikey": "{EVOLUTION_API_KEY}"
}
```

**Como processar na Edge Function `webhook-evolution`:**

1. Verificar `payload.event === "messages.upsert"` — ignorar qualquer outro evento
2. Verificar `payload.data.message.listResponseMessage` existe — ignorar se não for resposta de lista (pode ser outra mensagem recebida no número)
3. Extrair `payload.data.message.listResponseMessage.singleSelectReply.selectedRowId` — esse é o `rowId` que foi enviado na mensagem de lista
4. Separar o `rowId` no underscore: `const [numero, confirmacaoId] = rowId.split('_', 2)`
5. O `numero` mapeia para o `tipo_confirmacao`:
   - `"1"` → `ida_e_volta`
   - `"2"` → `somente_ida`
   - `"3"` → `somente_volta`
   - `"4"` → `nao_vai`
6. Extrair o telefone do remetente: `payload.data.key.remoteJid.replace('@s.whatsapp.net', '')`
7. Usar o `confirmacaoId` para atualizar a tabela `confirmacoes` no banco

**Importante:** O webhook pode receber outros tipos de mensagem além de respostas de lista (mensagens de texto avulsas, figurinhas, áudios do responsável). A Edge Function deve verificar `payload.data.message.listResponseMessage` antes de processar — se não existir, retornar 200 com `{ ignorado: true }` sem fazer nada.

---

## Implementação do cliente — _shared/evolution.ts

O arquivo `_shared/evolution.ts` deve exportar as seguintes funções com base nos endpoints acima:

```typescript
// Verifica se a instância está conectada
// Retorna true se state === "open", false caso contrário
export async function evolutionVerificarConexao(): Promise<boolean>

// Envia mensagem de texto simples
// Retorna o objeto completo da resposta (com key.id)
// Lança Error se a resposta não for 2xx
export async function evolutionEnviarTexto(
  telefone: string,
  mensagem: string
): Promise<{ key: { id: string }; status: string }>

// Envia mensagem de lista com opções de resposta
// rows: array de { rowId: string, title: string, description?: string }
// Retorna o objeto completo da resposta (com key.id)
// Lança Error se a resposta não for 2xx
export async function evolutionEnviarLista(
  telefone: string,
  titulo: string,
  descricao: string,
  rodape: string,
  rows: { rowId: string; title: string; description?: string }[]
): Promise<{ key: { id: string }; status: string }>

// Configura o webhook na Evolution API
// Chamado uma vez após criar a instância
export async function evolutionConfigurarWebhook(
  webhookUrl: string,
  webhookSecret: string
): Promise<void>
```

**Padrão de implementação para todas as funções:**

```typescript
const EVOLUTION_URL = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME')!

async function chamarEvolution(endpoint: string, method: string, body?: object) {
  const response = await fetch(`${EVOLUTION_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const erro = await response.text()
    throw new Error(`Evolution API [${response.status}]: ${erro}`)
  }

  return response.json()
}
```

---

## Formato do número de telefone

A Evolution API espera o número **sem formatação**, com código do país:

| Formato | Correto? |
|---|---|
| `5519999999999` | Sim |
| `+55 (19) 99999-9999` | Não |
| `19999999999` | Não — falta código do país |
| `5519999999999@s.whatsapp.net` | Não — isso é o remoteJid, não o number |

O telefone salvo na tabela `passageiros.telefone_responsavel` deve seguir o formato `5519999999999`. Validar no frontend antes de salvar.

---

## Estados da conexão

| State retornado pela API | Significado | O que fazer |
|---|---|---|
| `open` | Conectado e pronto | Pode enviar mensagens |
| `close` | Desconectado | Mostrar botão de reconectar no PWA |
| `connecting` | Reconectando automaticamente | Aguardar e tentar novamente em 30s |
| `refused` | Sessão expirada ou banida | Motorista precisa escanear QR Code novamente |

---

## Eventos do webhook usados

O SmartRoutes assina 3 eventos:

| Evento | Quando dispara | Tratamento na `webhook-evolution` |
|---|---|---|
| `MESSAGES_UPSERT` | Mensagem recebida do responsável | Processa resposta (texto puro 1-4 ou `listResponseMessage` legado) e atualiza `confirmacoes` |
| `QRCODE_UPDATED` | Evolution emite novo QR | Marca `instancias_whatsapp.status_conexao = 'aguardando_qr'` |
| `CONNECTION_UPDATE` | Estado da conexão muda | `state=open` → `conectado` + persiste `numero_conta`/`nome_conta_wa`. `state=close|refused` → `desconectado`. `state=connecting` → `conectando` |

Mensagens com `data.key.fromMe === true` (enviadas pelo próprio bot) são
ignoradas — evita interpretar o eco da resposta automática como nova
mensagem do passageiro.

---

## Resumo dos endpoints

| Endpoint | Método | Usado em |
|---|---|---|
| `/instance/connect/{instance}` | GET | `qr-code-whatsapp` (gera/recupera QR) |
| `/instance/connectionState/{instance}` | GET | `verificar-whatsapp`, `enviar-mensagem` |
| `/instance/fetchInstances?instanceName=...` | GET | `status-whatsapp`, `verificar-whatsapp` (estado + número + perfil) |
| `/instance/logout/{instance}` | DELETE | `desconectar-whatsapp` |
| `/message/sendText/{instance}` | POST | **Confirmação diária** + mensagens avulsas + resposta automática do webhook |
| `/message/sendList/{instance}` | POST | Não usado em produção (substituído por sendText) — disponível em `evolutionEnviarLista` para reativar quando o Baileys estabilizar |
| `/webhook/set/{instance}` | POST | `registrar-webhook` |


