# EDGE_FUNCTIONS.md — SmartRoutes

## O que são as Edge Functions

São funções TypeScript rodando no servidor Supabase (runtime Deno). Toda lógica de negócio sensível fica aqui — principalmente qualquer coisa que envolve a Evolution API, cujas credenciais nunca chegam ao frontend.

O frontend chama as funções via `supabase.functions.invoke('nome-da-funcao', { body: {...} })`. O JWT do usuário autenticado é anexado automaticamente — todas as funções devem validar esse JWT antes de qualquer operação.

---

## Estrutura de arquivos

```
supabase/functions/
├── _shared/
│   ├── cors.ts               → headers CORS reutilizáveis
│   ├── responses.ts          → helpers `ok()`, `erroCliente()`, `erroServidor()`
│   ├── auth.ts               → JWT helper + criarClienteUsuario / criarClienteServico
│   ├── evolution.ts          → cliente HTTP da Evolution API
│   └── viagem.ts             → processarIniciarViagem + helpers compartilhados
│                                (aplicarVariaveis, obterSaudacaoBrasil)
├── criar-perfil-motorista/   → chamada após primeiro login
├── iniciar-viagem/           → cria viagem + dispara mensagens
├── finalizar-viagem/         → finaliza viagem + popula histórico
├── webhook-evolution/        → recebe respostas + eventos de conexão do WhatsApp
├── enviar-mensagem/          → envio manual avulso
├── reenviar-confirmacao/     → reenvia mensagem para quem não respondeu
├── automacao-diaria/         → cron job multi-pass (envio inicial + reenvio)
├── qr-code-whatsapp/         → gera/retorna QR Code da instância
├── status-whatsapp/          → polling de status (atualiza instancias_whatsapp)
├── verificar-whatsapp/       → snapshot rápido do estado da Evolution
├── desconectar-whatsapp/     → logout resiliente (força local mesmo se Evolution recusar)
├── registrar-webhook/        → registra a URL do webhook na Evolution (idempotente)
└── otimizar-sequencia-passageiros/ → reordena passageiros via algoritmo
```

---

## Variáveis de ambiente disponíveis em todas as funções

Injetadas automaticamente pelo Supabase — não precisam ser configuradas:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Devem ser configuradas via `supabase secrets set`:
- `EVOLUTION_API_URL` — URL base da Evolution API (ex: https://evolution.railway.app)
- `EVOLUTION_API_KEY` — chave de acesso da Evolution API (token da instância, não a chave global)
- `EVOLUTION_INSTANCE_NAME` — nome da instância configurada na Evolution API
- `WEBHOOK_SECRET` — segredo para validar que o webhook veio da Evolution API
- `CRON_SECRET` — segredo para o cron job `pg_cron` chamar `automacao-diaria`

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
- Mantido apenas por compatibilidade/reativação futura. O fluxo de produção atual usa `sendText`
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
  "placa_van": "ABC-1234",
  "marca_van": "Mercedes-Benz",
  "modelo_van": "Sprinter",
  "ano_van": 2020
}
```

**O que faz:**
1. Valida JWT e extrae o `user` do Supabase Auth
2. Verifica se já existe um motorista com esse `user_id` — se sim, retorna os dados existentes sem criar duplicata, mas ainda garante as rotas padrão caso estejam faltando
3. Insere na tabela `motoristas` com `user_id`, `nome`, `email` (vindo do `user.email`), `telefone`, `placa_van`, `marca_van`, `modelo_van`, `ano_van` e `cnh` apenas se vier por compatibilidade
4. Chama a função SQL `criar_dados_iniciais_motorista(motorista_id)` que cria automaticamente: instância WhatsApp, configuração de automação, template de mensagem padrão e 4 opções de resposta
5. Garante também as 3 rotas padrão do motorista (`Rota Manhã`, `Rota Tarde`, `Rota Noite`) de forma idempotente
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
   - Insere/recupera em `confirmacoes` com `viagem_id`, `passageiro_id`, `status = 'pendente'`
   - Busca o template ativo do motorista e as opções de resposta ativas
   - Aplica variáveis `{nome_passageiro}`, `{data_formatada}` e `{saudacao}` no cabeçalho e rodapé
   - Monta o corpo TEXTO PURO (sendText) com as opções numeradas no corpo — **não** usa mais `sendList`/`evolutionEnviarLista` (decisão arquitetural: Baileys tem bugs em mensagens de lista; texto puro nunca é bloqueado pelo WhatsApp)
   - Chama `evolutionEnviarTexto(telefone, corpo)`
   - Se o envio der erro, registra em `mensagens` com `status_envio = 'falha'` e segue para o próximo passageiro (log explícito via `console.error '[processarIniciarViagem] sendText FALHOU'`)
   - Se o envio der certo, insere em `mensagens` com `tipo = 'confirmacao_diaria'`, `status_envio = 'enviada'`, `direcao = 'saida'`, `whatsapp_message_id` retornado pela Evolution API
8. Cria notificação `viagem_iniciada` para o motorista (primeira vez no dia)
9. Retorna o resumo

A lógica fica em `_shared/viagem.ts::processarIniciarViagem` — reusada por
`automacao-diaria` (cron) sem duplicação.

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

**Quando é chamada:** Evolution API faz POST nessa URL quando recebe uma resposta no WhatsApp **e** quando muda o estado da conexão (QR Code / open / close).

**Autenticação:** NÃO usa JWT. Valida o header `x-webhook-secret` contra `WEBHOOK_SECRET`.

**URL configurada na Evolution API:**
`https://SEU_PROJECT_ID.supabase.co/functions/v1/webhook-evolution`

**Eventos tratados:**
- `messages.upsert` — resposta do responsável (fluxo de confirmação)
- `qrcode.updated` — Evolution emitiu novo QR; marca `status_conexao = 'aguardando_qr'`
- `connection.update` — `state=open` marca `conectado` + persiste `numero_conta`/`nome_conta_wa` (extraídos do payload); `state=close|refused` marca `desconectado`; `connecting` marca `conectando`

**O que faz para `messages.upsert`:**
1. Valida `x-webhook-secret`; se inválido retorna 401
2. Ignora mensagens enviadas pelo próprio bot (`data.key.fromMe === true`)
3. Extrai texto de `conversation`, `extendedTextMessage.text`, legenda de imagem ou `listResponseMessage` legado
4. Extrai o telefone do responsável a partir de `data.key.remoteJid`
5. Chama `_shared/conversaConfirmacao.ts::processarMensagemConfirmacao`
6. O service resolve passageiro, confirmação do dia e estado da conversa em `conversas_confirmacao_whatsapp`
7. Valida opções aceitas (`1`, `2`, `3`, `4`) ou opções de decisão (`1` alterar, `2` manter), conforme o estado atual
8. Atualiza `confirmacoes` quando uma resposta válida é confirmada ou alterada
9. Registra mensagens de entrada e saída em `mensagens`
10. Envia a resposta automática pela Evolution API com `evolutionEnviarTexto`
11. Tudo usa `SUPABASE_SERVICE_ROLE_KEY` (sem JWT do usuário)

**Estados de conversa por dia:**
- `sem_resposta` — ainda não há resposta válida para a confirmação do dia
- `confirmado` — já existe resposta registrada
- `aguardando_decisao` — responsável enviou nova opção e o bot perguntou se deseja alterar
- `aguardando_nova_resposta` — responsável aceitou alterar e o bot aguarda uma nova opção de 1 a 4

**Arquitetura interna do processamento:**
- `_shared/conversaConfirmacao.ts` — service principal da regra de conversa
- `_shared/conversaValidacao.ts` — validação de opção de confirmação e decisão
- `_shared/conversaMensagens.ts` — textos de resposta automática e mensagens de erro
- `_shared/conversaRepository.ts` — acesso a passageiro, confirmação, estado da conversa, mensagens e notificações

**Importante:** A mensagem inicial de confirmação não fica neste webhook e não foi alterada. Ela continua sendo montada pelos fluxos de envio (`iniciar-viagem`, `automacao-diaria`, `reenviar-confirmacao`). O webhook trata apenas as respostas recebidas e as mensagens seguintes da conversa.

**Importante:** O Supabase Realtime notifica o frontend automaticamente quando `confirmacoes` ou `instancias_whatsapp` são atualizadas — nenhuma lógica extra necessária.

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

**Quando é chamada:** cron job — chamada automaticamente pelo Supabase **a cada minuto** (o filtro de horário fica dentro da função).

**Autenticação:** NÃO usa JWT. Valida `x-cron-secret`.

**Como configurar o cron:** ver [`docs/Cron_Automacao.md`](Cron_Automacao.md) e o arquivo cole-no-Dashboard `supabase/sql/cron_automacao.sql`. Resumo: `pg_cron` + `pg_net.http_post` com schedule `* * * * *` (todo minuto).

**Body opcional (testes manuais):**
```json
{
  "ignorar_horario": true,
  "motorista_id": "uuid-do-motorista"
}
```

- `motorista_id` restringe o disparo a um único motorista
- `ignorar_horario: true` exige `motorista_id` (salvaguarda contra disparo em massa); sem ele retorna 400 `MOTORISTA_ID_OBRIGATORIO`

**O que faz:**
1. Valida o header `x-cron-secret`
2. Busca todos os motoristas com `envio_automatico_ativo = true` em `configuracoes_automacao` (com `instancias_whatsapp` joined)
3. Aplica filtro `motorista_id` se passado
4. Para cada motorista elegível:
   - Verifica se a hora atual em `America/Sao_Paulo` bate **exatamente** com `horario_envio_automatico` (comparação `hh:mm === hh:mm`, sem janela de tolerância). Se não bate e não veio `ignorar_horario`, registra `cenario=fora_da_janela` e segue
   - Para cada rota ativa, decide o **cenário**:
     - **Cenário 1 — rota nova**: não existe viagem hoje → chama `processarIniciarViagem` (cria viagem + confirmações pendentes + envia para todos)
     - **Cenário 2 — viagem existe**: chama `processarReenvioPendentes` que busca confirmações `pendente` e reenvia apenas para esses (incrementa `mensagens.tentativas`)
     - **Cenário 2b — sem pendentes**: viagem existe mas todas confirmações já foram respondidas → encerra silenciosamente
   - No dia seguinte, uma nova viagem reinicia naturalmente o ciclo com todas as confirmações em `pendente`
5. Cada cenário emite log nominal: `cenario=rota_iniciada`, `cenario=reenvio_pendentes`, `cenario=sem_pendentes`, `cenario=fora_da_janela`
6. Acumula contadores por motorista e devolve em `detalhes[]`

**Retorna:**
```json
{
  "processados": 1,
  "com_erro": 0,
  "timezone": "America/Sao_Paulo",
  "horario_atual_local": "07:00",
  "data_local": "2026-05-12",
  "detalhes": [{
    "motorista_id": "uuid",
    "rotas_iniciadas": 1,
    "pendentes_reenviados": 3,
    "rotas_sem_pendentes": 2,
    "erros": []
  }]
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
- `MOTORISTA_ID_OBRIGATORIO` — `ignorar_horario=true` sem `motorista_id` (salvaguarda do cron)
- `INSTANCIA_NAO_ENCONTRADA` — `instancias_whatsapp` ausente para o motorista
- `EVOLUTION_SEM_QR` — `instance/connect` não retornou QR Code
- `EVOLUTION_LOGOUT_FALHOU` — Evolution recusou logout (mas a função força desconexão local mesmo assim)
- `SECRETS_AUSENTES` — `SUPABASE_URL`/`WEBHOOK_SECRET` faltando nos secrets

---

## Função: qr-code-whatsapp

**Quando é chamada:** motorista clica em "Conectar WhatsApp" na tela WhatsApp.

**Autenticação:** JWT obrigatório.

**O que faz:**
1. Se a instância já está `open` na Evolution, atualiza `instancias_whatsapp` para `conectado` e responde `{ ja_conectado: true }` (UI fecha o modal e mostra "Conectado")
2. Caso contrário, chama `GET /instance/connect/{instance}` na Evolution, com até 6 tentativas (intervalo de 2s) — algumas versões do Baileys demoram a emitir QR
3. Aceita base64 direto ou texto QR (renderiza com `qrcode` se vier só texto)
4. Atualiza `instancias_whatsapp.status_conexao = 'aguardando_qr'`
5. Retorna `{ qr: data-url, pairing_code, expira_em_segundos: 60 }`

---

## Função: status-whatsapp

**Quando é chamada:** polling do frontend a cada 3s enquanto o modal de QR está aberto.

**Autenticação:** JWT obrigatório.

**O que faz:**
1. Lê o `status_conexao` atual de `instancias_whatsapp` (preserva `aguardando_qr` quando Evolution responde estado nulo)
2. Consulta `instance/fetchInstances` (com fallback para `instance/connectionState`)
3. Mapeia `state` → `status_conexao` (open → conectado, connecting → conectando, close/refused/null → desconectado)
4. Upsert em `instancias_whatsapp` com `numero_conta`, `nome_conta_wa`, `data_ultima_conexao` quando conectado
5. Retorna `{ instancia, conectado, status, evolution_disponivel, erro_evolution }`

---

## Função: verificar-whatsapp

**Quando é chamada:** snapshot rápido do estado da Evolution. Fonte de verdade principal usada pelo polling do QR e pelo botão "Verificar Conexão".

**Autenticação:** JWT obrigatório.

**O que faz:** mesma lógica de mapeamento de `status-whatsapp`, porém otimizado para resposta rápida — usado em hot path (polling 3s). Atualiza `instancias_whatsapp` via service role.

---

## Função: desconectar-whatsapp

**Quando é chamada:** motorista clica no botão de desconectar.

**Autenticação:** JWT obrigatório (POST ou DELETE).

**Comportamento resiliente:** tenta `DELETE /instance/logout/{instance}` na Evolution. **Independente da Evolution responder OK ou erro**, força o estado local para `desconectado` com `numero_conta=null, nome_conta_wa=null`. Se a Evolution falhou, retorna `evolution_aviso` para o frontend mostrar um toast informativo (não erro vermelho).

---

## Função: registrar-webhook

**Quando é chamada:** one-shot pelo motorista (ou via terminal) para registrar/atualizar a URL e os eventos do webhook na Evolution API.

**Autenticação:** JWT obrigatório.

**Body opcional:** `{ "eventos": ["MESSAGES_UPSERT", "QRCODE_UPDATED", "CONNECTION_UPDATE"] }`. Sem body, usa o padrão `EVENTOS_WEBHOOK_PADRAO` exportado por `_shared/evolution.ts` (lista exatamente esses 3 eventos).

**O que faz:** chama `POST /webhook/set/{instance}` na Evolution com `webhook_by_events: true`, `webhook_base64: false`, URL apontando para `webhook-evolution` e header `x-webhook-secret`.

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
| `criar-perfil-motorista` | Frontend (primeiro login) | JWT | Cria motorista + dados iniciais (instância, template, opções, 3 rotas padrão) |
| `iniciar-viagem` | Frontend (botão iniciar) | JWT | Cria viagem + envia mensagens via sendText |
| `finalizar-viagem` | Frontend (botão finalizar) | JWT | Finaliza viagem + marca ausentes |
| `webhook-evolution` | Evolution API | Webhook secret | Processa respostas (texto/listResponse) + eventos de conexão |
| `enviar-mensagem` | Frontend (envio manual) | JWT | Mensagem avulsa para responsável |
| `reenviar-confirmacao` | Frontend (botão reenviar) | JWT | Reenvia mensagem para confirmação ainda pendente |
| `automacao-diaria` | Cron pg_cron | Cron secret | Multi-pass: cria viagem nova OU reenvia só pendentes |
| `qr-code-whatsapp` | Frontend (Conectar WhatsApp) | JWT | Gera/retorna QR Code e marca `aguardando_qr` |
| `status-whatsapp` | Frontend (polling) | JWT | Polling do estado da Evolution, atualiza `instancias_whatsapp` |
| `verificar-whatsapp` | Frontend (botão Verificar) | JWT | Snapshot rápido do estado da conexão |
| `desconectar-whatsapp` | Frontend (botão Desconectar) | JWT | Logout resiliente (força local mesmo se Evolution falhar) |
| `registrar-webhook` | One-shot do motorista | JWT | (Re)registra webhook na Evolution com 3 eventos |
| `otimizar-sequencia-passageiros` | Frontend (botão Otimizar) | JWT | Reordena `ordem_na_rota` via algoritmo |


