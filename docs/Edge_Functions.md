# EDGE_FUNCTIONS.md — SmartRoute

## O que são as Edge Functions

São funções TypeScript rodando no servidor Supabase (runtime Deno). Toda lógica de negócio sensível fica aqui — principalmente qualquer coisa que envolve a Evolution API, cujas credenciais nunca chegam ao frontend.

O frontend chama as funções via `supabase.functions.invoke('nome-da-funcao', { body: {...} })`. O JWT do usuário autenticado é anexado automaticamente — todas as funções devem validar esse JWT antes de qualquer operação.

---

## Estrutura de arquivos a criar

```
supabase/functions/
├── _shared/
│   ├── cors.ts               → headers CORS reutilizáveis
│   ├── evolution.ts          → cliente HTTP da Evolution API
│   └── auth.ts               → helper para validar JWT e buscar motorista
├── criar-perfil-motorista/
│   └── index.ts              → chamada após primeiro login
├── iniciar-viagem/
│   └── index.ts              → cria viagem + dispara WhatsApp
├── finalizar-viagem/
│   └── index.ts              → finaliza viagem + popula histórico
├── webhook-evolution/
│   └── index.ts              → recebe respostas do WhatsApp
├── enviar-mensagem/
│   └── index.ts              → envio manual avulso
├── reenviar-confirmacao/
│   └── index.ts              → reenvia mensagem para quem não respondeu
└── automacao-diaria/
    └── index.ts              → cron job de envio automático
```

---

## Variáveis de ambiente disponíveis em todas as funções

Injetadas automaticamente pelo Supabase — não precisam ser configuradas:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Devem ser configuradas via `supabase secrets set`:
- `EVOLUTION_API_URL` — URL base da Evolution API (ex: https://evolution.railway.app)
- `EVOLUTION_API_KEY` — chave de acesso da Evolution API
- `EVOLUTION_INSTANCE_NAME` — nome da instância configurada na Evolution API
- `WEBHOOK_SECRET` — segredo para validar que o webhook veio da Evolution API

---

## Padrão obrigatório em todas as funções autenticadas

Toda função que recebe chamada do frontend deve:

1. Responder `OPTIONS` com headers CORS (preflight)
2. Extrair o header `Authorization` da requisição
3. Criar o cliente Supabase com esse header para que o RLS se aplique
4. Chamar `supabase.auth.getUser()` — se retornar erro ou `user` nulo, retornar 401
5. Buscar o motorista na tabela `motoristas` onde `user_id = auth.uid()`
6. Só então executar a lógica de negócio

Funções chamadas por webhook externo (Evolution API) **não usam JWT** — usam o `WEBHOOK_SECRET` no header `x-webhook-secret` para autenticação.

Funções de cron job (`automacao-diaria`) usam `SUPABASE_SERVICE_ROLE_KEY` diretamente, sem JWT.

---

## _shared/cors.ts

Exporta um objeto `corsHeaders` com os headers necessários para CORS. Usado em todas as funções para responder ao preflight `OPTIONS` e incluir nos headers de resposta.

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
```

---

## _shared/evolution.ts

Cliente HTTP da Evolution API. Nunca importado pelo frontend — só pelas Edge Functions.

Deve exportar as seguintes funções:

**`evolutionEnviarTexto(telefone: string, mensagem: string): Promise<any>`**
- Faz POST em `{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE_NAME}`
- Header: `apikey: {EVOLUTION_API_KEY}`
- Body: `{ number: telefone, text: mensagem }`
- Se a resposta não for 2xx, lançar Error com o status e body da resposta

**`evolutionEnviarLista(telefone: string, titulo: string, descricao: string, opcoes: {rowId: string, title: string}[]): Promise<any>`**
- Faz POST em `{EVOLUTION_API_URL}/message/sendList/{EVOLUTION_INSTANCE_NAME}`
- Body: `{ number, title, description, buttonText: 'Responder', sections: [{ title: 'Opções', rows: opcoes }] }`
- Usado para enviar a mensagem de confirmação com botões numerados
- Se a resposta não for 2xx, lançar Error

**`evolutionVerificarConexao(): Promise<boolean>`**
- Faz GET em `{EVOLUTION_API_URL}/instance/connectionState/{EVOLUTION_INSTANCE_NAME}`
- Retorna `true` se o estado for `open`, `false` caso contrário

---

## _shared/auth.ts

Helper que extrai e valida o motorista da requisição.

**`getMotorista(req: Request): Promise<{ user, motorista, supabase }>`**
- Cria cliente Supabase com o header Authorization da requisição
- Chama `supabase.auth.getUser()`
- Se erro ou user nulo, lança Error com mensagem 'NAO_AUTORIZADO'
- Busca `motoristas` onde `user_id = user.id`
- Se não encontrar, lança Error com mensagem 'MOTORISTA_NAO_ENCONTRADO'
- Retorna `{ user, motorista, supabase }`

---

## Função: criar-perfil-motorista

**Quando é chamada:** logo após o primeiro login do motorista, pelo frontend.

**Autenticação:** JWT obrigatório.

**Recebe no body:**
```json
{
  "nome": "João da Silva",
  "telefone": "19999999999",
  "cnh": "12345678901"
}
```

**O que faz:**
1. Valida JWT e extrae o `user` do Supabase Auth
2. Verifica se já existe um motorista com esse `user_id` — se sim, retorna os dados existentes sem criar duplicata
3. Insere na tabela `motoristas` com `user_id`, `nome`, `email` (vindo do `user.email`), `telefone`, `cnh`
4. Chama a função SQL `criar_dados_iniciais_motorista(motorista_id)` que cria automaticamente: instância WhatsApp, configuração de automação, template de mensagem padrão e 4 opções de resposta
5. Retorna o motorista criado com status 201

**Retorna:**
```json
{
  "motorista": { "id": "uuid", "nome": "...", "email": "..." },
  "criado": true
}
```

**Erros possíveis:**
- 401 se JWT inválido
- 400 se `nome` não informado
- 500 se erro no banco

---

## Função: iniciar-viagem

**Quando é chamada:** motorista aperta o botão "Iniciar rota" no PWA.

**Autenticação:** JWT obrigatório.

**Recebe no body:**
```json
{
  "rota_id": "uuid-da-rota"
}
```

**O que faz:**
1. Valida JWT e busca o motorista
2. Verifica se a rota existe e pertence ao motorista — se não, retorna 403
3. Verifica se já existe uma viagem para essa rota hoje (`unique rota_id + data`) — se sim, retorna a viagem existente sem criar duplicata
4. Insere em `viagens` com `rota_id`, `data = hoje`, `status = 'em_andamento'`, `iniciada_em = now()`
5. Insere em `listas_diarias` com `viagem_id`
6. Busca todos os passageiros `ativos` da rota, ordenados por `ordem_na_rota`
7. Para cada passageiro:
   - Insere em `confirmacoes` com `viagem_id`, `passageiro_id`, `status = 'pendente'`
   - Busca o template ativo do motorista e as opções de resposta ativas
   - Monta o texto da mensagem usando `cabecalho` + nome do passageiro + opções numeradas + `rodape`
   - Chama `evolutionEnviarLista()` com `rowId` no formato `{numero}_{confirmacao_id}` para cada opção
   - Se o envio der erro, registra em `mensagens` com `status_envio = 'falha'` e continua para o próximo passageiro
   - Se o envio der certo, insere em `mensagens` com `tipo = 'confirmacao_diaria'`, `status_envio = 'enviada'`, `direcao = 'saida'`, `whatsapp_message_id` retornado pela Evolution API
8. Retorna o resumo

**Retorna:**
```json
{
  "viagem_id": "uuid",
  "total_passageiros": 8,
  "mensagens_enviadas": 7,
  "mensagens_com_falha": 1,
  "resultados": [
    { "passageiro_id": "uuid", "nome": "Ana", "sucesso": true },
    { "passageiro_id": "uuid", "nome": "João", "sucesso": false, "erro": "..." }
  ]
}
```

**Erros possíveis:**
- 401 se JWT inválido
- 400 se `rota_id` não informado
- 403 se rota não pertence ao motorista
- 404 se nenhum passageiro ativo na rota

---

## Função: finalizar-viagem

**Quando é chamada:** motorista aperta "Finalizar viagem" no PWA.

**Autenticação:** JWT obrigatório.

**Recebe no body:**
```json
{
  "viagem_id": "uuid-da-viagem"
}
```

**O que faz:**
1. Valida JWT e busca o motorista
2. Verifica se a viagem existe e pertence ao motorista (via rota) — se não, 403
3. Marca todas as confirmações ainda `pendentes` dessa viagem como `ausente`
4. Atualiza `viagens` com `status = 'finalizada'`, `finalizada_em = now()`
5. O trigger `trigger_finalizar_viagem` no banco popula `historico_presenca` automaticamente

**Retorna:**
```json
{
  "viagem_id": "uuid",
  "finalizadaEm": "2025-04-21T18:00:00Z",
  "ausentes_marcados": 2
}
```

---

## Função: webhook-evolution

**Quando é chamada:** Evolution API faz POST nessa URL quando um responsável responde no WhatsApp.

**Autenticação:** NÃO usa JWT. Valida o header `x-webhook-secret` contra `WEBHOOK_SECRET`.

**URL configurada na Evolution API:**
`https://SEU_PROJECT_ID.supabase.co/functions/v1/webhook-evolution`

**Recebe no body:** payload padrão da Evolution API (evento `messages.upsert`).

**O que faz:**
1. Valida que `req.headers.get('x-webhook-secret') === WEBHOOK_SECRET` — se não, retorna 401
2. Extrai o campo `event` do payload — se não for `messages.upsert`, retorna 200 com `{ ignorado: true }`
3. Verifica se a mensagem é do tipo `listResponseMessage` — se não for, ignora
4. Extrai o `selectedRowId` da resposta — formato esperado: `{numero}_{confirmacao_id}` (ex: `1_uuid-da-confirmacao`)
5. Separa o número e o `confirmacao_id` pelo underscore
6. Busca a confirmação — se não encontrar, retorna 404
7. Se o status já não for `pendente`, ignora (evita processamento duplicado)
8. Mapeia o número para o `tipo_confirmacao`:
   - `1` → `ida_e_volta`
   - `2` → `somente_ida`
   - `3` → `somente_volta`
   - `4` → `nao_vai`
9. Atualiza `confirmacoes` com `status = 'confirmado'`, `tipo_confirmacao`, `origem = 'whatsapp'`, `respondida_em = now()`
10. Insere em `mensagens` com `tipo = 'resposta_confirmacao'`, `direcao = 'entrada'`, o conteúdo da resposta e o `whatsapp_message_id`
11. Envia mensagem de confirmação de volta para o responsável via `evolutionEnviarTexto()` — texto diferente conforme `tipo_confirmacao`:
    - `ida_e_volta` / `somente_ida` / `somente_volta` → "Confirmado! {nome} estará aguardando a van. Bom dia!"
    - `nao_vai` → "Entendido! {nome} não vai hoje. Obrigado por avisar."
12. Insere essa mensagem de retorno em `mensagens` com `direcao = 'saida'`
13. Usa `SUPABASE_SERVICE_ROLE_KEY` para todas as operações no banco (sem restrição de RLS, pois não há JWT de usuário)

**Retorna:**
```json
{
  "sucesso": true,
  "confirmacao_id": "uuid",
  "status": "confirmado",
  "tipo": "ida_e_volta"
}
```

**Importante:** O Supabase Realtime notifica o frontend automaticamente quando `confirmacoes` é atualizado — nenhuma lógica extra necessária.

---

## Função: enviar-mensagem

**Quando é chamada:** motorista envia uma mensagem manual para um responsável específico no PWA.

**Autenticação:** JWT obrigatório.

**Recebe no body:**
```json
{
  "passageiro_id": "uuid",
  "mensagem": "Texto livre da mensagem"
}
```

**O que faz:**
1. Valida JWT e busca o motorista
2. Verifica se `passageiro_id` e `mensagem` foram informados — se não, 400
3. Busca o passageiro e verifica que ele pertence a uma rota do motorista autenticado — se não, 403
4. Verifica se a instância WhatsApp do motorista está conectada via `evolutionVerificarConexao()` — se não, retorna erro 503 com mensagem clara
5. Chama `evolutionEnviarTexto()` com o `telefone_responsavel` do passageiro
6. Insere em `mensagens` com `tipo = 'avulsa'`, `direcao = 'saida'`, `status_envio = 'enviada'`
7. `confirmacao_id` fica nulo (mensagem não vinculada a uma confirmação)

**Retorna:**
```json
{
  "sucesso": true,
  "passageiro": "Ana Clara",
  "telefone": "19999999999"
}
```

---

## Função: reenviar-confirmacao

**Quando é chamada:** motorista clica em "Reenviar" para um passageiro que não respondeu.

**Autenticação:** JWT obrigatório.

**Recebe no body:**
```json
{
  "confirmacao_id": "uuid"
}
```

**O que faz:**
1. Valida JWT e busca o motorista
2. Busca a confirmação — verifica que pertence a uma viagem de uma rota do motorista
3. Se o status não for `pendente`, retorna erro — não faz sentido reenviar para quem já respondeu
4. Busca o passageiro para pegar o `telefone_responsavel`
5. Busca o template ativo e as opções de resposta do motorista
6. Monta e envia a mensagem novamente via `evolutionEnviarLista()` com os mesmos `rowId` da confirmação original
7. Insere em `mensagens` como novo envio com `tipo = 'confirmacao_diaria'`, incrementa a contagem de tentativas buscando mensagens anteriores dessa confirmação
8. Registra em `log_mensagens` o evento `reenvio`

**Retorna:**
```json
{
  "sucesso": true,
  "confirmacao_id": "uuid",
  "tentativa": 2
}
```

---

## Função: automacao-diaria

**Quando é chamada:** cron job — chamada automaticamente pelo Supabase no horário configurado pelo motorista.

**Autenticação:** NÃO usa JWT. Chamada interna via `SUPABASE_SERVICE_ROLE_KEY`.

**Como configurar o cron no Supabase:**

O job deve rodar a cada 5 minutos. A funÃ§Ã£o filtra internamente o horÃ¡rio de envio de cada motorista e tambÃ©m aplica `horario_limite_resposta`, marcando pendentes como ausentes quando o limite passa.

O projeto versiona a migration `supabase/migrations/20260509010000_cron_automacao_diaria_5min.sql`. Ela tenta ler o secret `smartroutes_cron_secret` do Supabase Vault. Se o secret ainda nÃ£o existir, rode uma vez:

```sql
select public.configurar_cron_automacao_diaria_5min('SEU_CRON_SECRET');
```

SQL manual equivalente:
```sql
select cron.schedule(
  'automacao-diaria-smartroute',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/automacao-diaria',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "SEU_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

**O que faz:**
1. Valida o header `x-cron-secret`
2. Busca todos os motoristas com `envio_automatico_ativo = true` em `configuracoes_automacao`
3. Verifica se o `horario_envio_automatico` corresponde à hora atual (tolerância de ±5 minutos)
4. Para cada motorista elegível:
   - Busca todas as rotas ativas do motorista
   - Para cada rota, verifica se já existe uma viagem para hoje — se sim, pula
   - Chama a lógica de `iniciar-viagem` internamente (sem HTTP, chamada direta da função)
5. Registra sucesso ou falha em `log_mensagens` para cada motorista processado

**Retorna:**
```json
{
  "processados": 3,
  "com_erro": 0,
  "detalhes": [
    { "motorista_id": "uuid", "rotas_iniciadas": 2 }
  ]
}
```

---

## Tratamento de erros — padrão obrigatório

Todas as funções devem seguir o mesmo padrão de resposta de erro:

```typescript
// Sucesso
return new Response(
  JSON.stringify({ ...dados }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)

// Erro de cliente (400, 401, 403, 404)
return new Response(
  JSON.stringify({ erro: 'Mensagem clara em português', codigo: 'CODIGO_ERRO' }),
  { status: 4xx, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)

// Erro interno (500)
return new Response(
  JSON.stringify({ erro: 'Erro interno do servidor', detalhes: String(err) }),
  { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)
```

Códigos de erro padronizados:
- `NAO_AUTORIZADO` — JWT inválido ou ausente
- `MOTORISTA_NAO_ENCONTRADO` — user autenticado mas sem perfil de motorista
- `ROTA_NAO_ENCONTRADA` — rota não existe ou não pertence ao motorista
- `PASSAGEIRO_NAO_ENCONTRADO` — passageiro não existe ou não pertence ao motorista
- `VIAGEM_JA_EXISTE` — já existe viagem para essa rota hoje
- `CONFIRMACAO_JA_RESPONDIDA` — tentativa de reenviar para quem já respondeu
- `WHATSAPP_DESCONECTADO` — instância não está conectada
- `WEBHOOK_INVALIDO` — secret do webhook não confere

---

## Como o frontend chama as funções

```typescript
// src/app/services/viagemService.ts
import { supabase } from '../lib/supabase'

export async function iniciarViagem(rotaId: string) {
  const { data, error } = await supabase.functions.invoke('iniciar-viagem', {
    body: { rota_id: rotaId },
  })
  if (error) throw error
  return data
}

export async function finalizarViagem(viagemId: string) {
  const { data, error } = await supabase.functions.invoke('finalizar-viagem', {
    body: { viagem_id: viagemId },
  })
  if (error) throw error
  return data
}

export async function reenviarConfirmacao(confirmacaoId: string) {
  const { data, error } = await supabase.functions.invoke('reenviar-confirmacao', {
    body: { confirmacao_id: confirmacaoId },
  })
  if (error) throw error
  return data
}
```

O `supabase.functions.invoke` anexa o JWT automaticamente — não passar manualmente.

---

## Como o frontend escuta atualizações em tempo real

```typescript
// src/app/hooks/useConfirmacoes.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useConfirmacoes(viagemId: string) {
  const [confirmacoes, setConfirmacoes] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('confirmacoes')
      .select('*, passageiros(nome_completo, ordem_na_rota)')
      .eq('viagem_id', viagemId)
      .order('passageiros(ordem_na_rota)')
      .then(({ data }) => setConfirmacoes(data ?? []))

    const channel = supabase
      .channel(`confirmacoes_viagem_${viagemId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'confirmacoes',
        filter: `viagem_id=eq.${viagemId}`,
      }, (payload) => {
        setConfirmacoes(prev =>
          prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [viagemId])

  return confirmacoes
}
```

---

## Resumo das funções

| Função | Chamada por | Autenticação | Propósito |
|---|---|---|---|
| `criar-perfil-motorista` | Frontend (primeiro login) | JWT | Cria motorista + dados iniciais |
| `iniciar-viagem` | Frontend (botão iniciar) | JWT | Cria viagem + dispara WhatsApp |
| `finalizar-viagem` | Frontend (botão finalizar) | JWT | Finaliza viagem + marca ausentes |
| `webhook-evolution` | Evolution API | Webhook secret | Processa respostas do WhatsApp |
| `enviar-mensagem` | Frontend (envio manual) | JWT | Mensagem avulsa para responsável |
| `reenviar-confirmacao` | Frontend (botão reenviar) | JWT | Reenvia para quem não respondeu |
| `automacao-diaria` | Cron job Supabase | Cron secret | Inicia rotas automaticamente |
