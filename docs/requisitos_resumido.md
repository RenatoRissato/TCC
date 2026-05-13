# REQUISITOS.md — SmartRoutes

## Como usar este arquivo

Este arquivo é a referência de requisitos para implementação. Leia antes de gerar qualquer código de funcionalidade. As regras de negócio (RNs) são especialmente importantes — elas definem comportamentos que não são óbvios só olhando o banco.

---

## Módulos do sistema — visão geral

| Módulo | RF | Prioridade | Complexidade | Status |
|---|---|---|---|---|
| Autenticação | RF01, RF02 | Alta | Média | ✅ Implementado |
| Gestão de rotas | RF18 | Alta | Baixa | ✅ Implementado |
| Gestão de passageiros | RF03, RF04, RF05, RF06, RF17 | Alta | Baixa/Média | ✅ Implementado |
| Lista diária | RF07, RF08 | Alta | Alta | ✅ Implementado |
| Templates de mensagem | RF09 | Alta | Média | ✅ Implementado (com `{saudacao}`) |
| Integração WhatsApp | RF10, RF11, RF12 | Alta/Média | Alta | ✅ Implementado (QR real, sendText, webhook completo) |
| Automação de envio | RF19 | Alta | Alta | ✅ Implementado (cron multi-pass, horário exato) |
| Visualização de rota | RF13 | Média | Média | ✅ Implementado (LiveTripScreen + Maps) |
| Histórico de presenças | RF14 | Média | Média | 🟡 Dados em `historico_presenca`, falta tela |
| Dashboard | RF15 | Média | Baixa | ✅ Implementado |
| Logout | RF16 | Alta | Baixa | ✅ Implementado |

---

## Regras de negócio críticas — implementar exatamente assim

### Autenticação e perfil

- **RN01** — Email deve ser único no sistema
- **RN02** — Sessão gerenciada pelo Supabase Auth (JWT automático — não implementar JWT manual)
- **RN03** — Ao criar conta, chamar a função SQL `criar_dados_iniciais_motorista(id)` que gera automaticamente: instância WhatsApp, configuração de automação, template padrão com 4 opções

### Rotas

- **RN62** — Um motorista pode ter várias rotas (ex: Rota Manhã, Rota Tarde)
- **RN63** — Passageiro pertence a uma rota, não ao motorista diretamente. FK é `rota_id`, não `motorista_id`
- **RN64** — Rota inativa não gera viagem automática nem aparece no envio do dia
- **RN65** — Não permitir excluir rota com passageiros ativos — apenas inativar

### Passageiros

- **RN06** — Nome mínimo 3 caracteres
- **RN07** — Telefone deve ter 10 ou 11 dígitos (com DDD). Formato: `5519999999999` (com código do país para WhatsApp)
- **RN08** — Endereço é obrigatório
- **RN09** — Turno obrigatório: manhã / tarde / integral
- **RN10** — Listar apenas passageiros com status `ativo` por padrão
- **RN13** — Nunca permitir editar passageiro de outro motorista (RLS garante, mas validar na Edge Function também)
- **RN14** — Na implementação atual, a exclusão de passageiro é física (**hard delete**) após confirmação explícita do motorista
- **RN15** — Passageiro excluído deixa de aparecer na lista diária, em viagens futuras e em envios de WhatsApp
- **RN16** — Registros históricos já materializados em `historico_presenca` e `mensagens` continuam acessíveis para consulta operacional

### Lista diária e confirmações

- **RN17** — Lista carrega automaticamente ao abrir a página (busca confirmações da viagem do dia)
- **RN18** — Status padrão de toda confirmação criada é `pendente`
- **RN19** — Ao marcar checkbox manualmente: `status = confirmado`, `origem = manual`
- **RN20** — Ao desmarcar checkbox: `status = ausente`, `origem = manual`
- **RN21** — Uma confirmação por passageiro por viagem (unique constraint no banco)
- **RN22** — Última marcação prevalece — update no registro existente, não insert
- **RN33** — Passageiro pode alterar confirmação via WhatsApp múltiplas vezes (última prevalece)

### Templates de mensagem

- **RN24** — Cada motorista tem seu próprio template (criado automaticamente na conta)
- **RN25** — Template padrão aplicado automaticamente ao criar conta (via `criar_dados_iniciais_motorista`)
- **RN26** — As 4 opções do template sempre existem. Não podem ser removidas, apenas renomeadas
- **RN27** — Substituir `{saudacao}`, `{nome_passageiro}` e `{data_formatada}` antes de enviar qualquer mensagem. A substituição acontece **na Edge Function**, nunca no frontend
- **RN28** — Alterações no template afetam apenas mensagens enviadas a partir daquele momento
- **RN71** — `{saudacao}` é calculada conforme horário em `America/Sao_Paulo`:
  00h–11h59 → "Bom dia"; 12h–17h59 → "Boa tarde"; 18h–23h59 → "Boa noite".
  Calculada **uma vez** por viagem para todos os passageiros receberem a mesma

**Template padrão (cabeçalho):**
```
{saudacao}! Confirmação de presença na van escolar para hoje.
```

**Corpo final montado na Edge Function:**
```
Bom dia! Confirmação de presença na van escolar para hoje.

Responda com o número da opção desejada:
1 - Ida e volta
2 - Somente ida
3 - Somente volta
4 - Não vai hoje

Aguardo sua resposta. Obrigado!
```

### WhatsApp e mensagens

- **RN29** — Mensagens enviadas apenas para passageiros com status `ativo`
- **RN30** — Telefone no formato brasileiro com código do país: `55` + DDD + número (ex: `5519999999999`)
- **RN32** — Respostas recebidas via webhook da Evolution API, processadas em tempo real
- **RN33** — Última resposta prevalece (update, não insert)
- **RN34** — Registrar timestamp de cada interação em `mensagens_log`
- **RN35** — Mensagens não entregues geram alerta visual para o motorista
- **RN36** — Sistema continua funcionando sem WhatsApp (fallback: marcação manual na lista diária)
- **RN37** — QR Code escaneado uma vez só — sessão persistida pela Evolution API
- **RN46** — Uma instância WhatsApp por motorista
- **RN47** — Instância persistida pela Evolution API (não precisa reconectar ao reiniciar)

### Mensagem de confirmação (sendText puro)

Decisão arquitetural: o sistema migrou de `sendList` para `sendText` porque o
Baileys/Evolution v2 ficou instável com mensagens de lista (bugs `isZero` e
restrição do WhatsApp para APIs não-Business). Detalhes em
[docs/evolution_api.md](evolution_api.md#3-enviar-confirmação-de-presença-texto-puro).

- **Usar `sendText` da Evolution API** com as 4 opções numeradas no corpo
- Responsável **digita** o número da opção (1, 2, 3 ou 4)
- Webhook aceita variações: `"1"`, `"1 - Ida e volta"`, `"1."`, etc.
  Regex: `^([1-4])\b` no início do texto trimado
- Ao receber webhook, mapear o dígito:
  - `1` → `ida_e_volta`
  - `2` → `somente_ida`
  - `3` → `somente_volta`
  - `4` → `nao_vai`
- A confirmação a atualizar é resolvida pelo **telefone do remetente** →
  passageiro → última confirmação `pendente` daquele passageiro
- O webhook ainda aceita `listResponseMessage` legado (com `rowId` no
  formato `{numero}_{confirmacao_id}`) caso `sendList` seja reativado no
  futuro
- **RN43** — Uma mensagem de confirmação de retorno por resposta válida recebida
- **RN44** — Não existe mais horário limite operacional para resposta. A confirmação permanece vinculada à viagem do dia e o próximo ciclo diário nasce com novas confirmações `pendente`
- **RN72** — `confirmado + nao_vai` é semanticamente igual a `ausente` na UI:
  ambos viram `nao_vai_hoje` via `statusUIDaConfirmacao()` e o aluno é
  excluído do trajeto do Google Maps

### Automação de envio (diferencial principal)

- **RN66** — Cada motorista tem seu próprio `horario_envio_automatico` em
  `configuracoes_automacao`. O `pg_cron` global dispara a cada minuto e a
  Edge Function `automacao-diaria` decide quais motoristas processar por
  comparação **exata** de hora:minuto em `America/Sao_Paulo` (sem janela
  de tolerância)
- **RN67** — Horários configuráveis entre 05:00 e 22:00 apenas
- **RN68** — Envio automático só para passageiros ativos da rota
- **RN69** — Se WhatsApp desconectado no horário, alertar motorista em vez de falhar silenciosamente
- **RN70** — Motorista não precisa abrir o app para o envio ocorrer (cron job roda no servidor)
- **RN73** — Cron **multi-pass**: se a viagem do dia ainda não existe →
  cria + envia para todos. Se já existe → reenvia mensagem apenas para
  confirmações com `status='pendente'` (não duplica para quem já respondeu)
- **RN74** — O cron não converte mais pendentes em `ausente` por horário.
  O reenvio atua apenas sobre confirmações `pendente` da viagem do dia; no
  dia seguinte, uma nova viagem recria o ciclo inteiro em `pendente`
- **RN75** — Salvaguarda contra disparo em massa: quando a UI/teste passa
  `ignorar_horario=true`, `motorista_id` é obrigatório (400
  `MOTORISTA_ID_OBRIGATORIO` se ausente)

### Configuração e monitoramento WhatsApp

- **RN49** — QR Code renovado automaticamente a cada 60 segundos via polling na Evolution API
- **RN50** — Estatísticas de mensagens resetam mensalmente
- **RN51** — Envio automático pode ser desativado sem desconectar a instância WhatsApp
- **RN52** — Horários configuráveis somente entre 6h e 22h
- **RN53** — Mensagens de teste enviadas apenas ao próprio número do motorista

### Visualização de rota

- **RN54** — Ordenar paradas por `horario_embarque` do passageiro
- **RN55** — Passageiros sem horário aparecem no final da lista
- **RN56** — Exibir apenas passageiros com status `confirmado` no dia

### Histórico

- **RN57** — Histórico nunca é excluído
- **RN58** — Registros históricos consolidados permanecem acessíveis mesmo quando o cadastro original do passageiro já foi removido
- **RN59** — Taxa de presença = (confirmados / total dias) × 100

---

## Requisitos não-funcionais — restrições de implementação

### Performance

- Carregamento inicial da página: máximo 5 segundos
- Requisições à API: máximo 5 segundos
- Atualização de lista após marcar presença: menos de 500ms (usar Supabase Realtime)
- Envio de mensagem individual via Evolution API: máximo 10 segundos
- Processamento de webhook: menos de 5 segundos
- Envio de lote de 20 mensagens: máximo 5 minutos com intervalo entre envios
- Chamadas à Evolution API devem ser assíncronas (não bloqueantes)

### Interface e usabilidade

- Mobile-first, suporte 320px a 1920px
- Botões mínimo 44×44px (touch-friendly)
- Máximo 3 cliques para qualquer funcionalidade
- Mensagens de erro em português, sem jargões técnicos
- Confirmação obrigatória antes de ações destrutivas (excluir, desconectar WhatsApp)
- Status da conexão WhatsApp sempre visível no header

### Segurança

- Autenticação via Supabase Auth (JWT automático em todas as rotas protegidas)
- RLS ativo em todas as tabelas do Supabase (cada motorista acessa só seus dados)
- API key da Evolution API nunca vai ao frontend — apenas nas Edge Functions
- Webhook da Evolution API validado via header `x-webhook-secret`
- HTTPS em produção (garantido pelo Vercel e Supabase)
- Validar inputs no frontend E na Edge Function (nunca confiar só no frontend)

### Confiabilidade WhatsApp

- Retry automático: até 3 tentativas com intervalo de 5 segundos em falhas na Evolution API
- Timeout de 30 segundos por chamada à Evolution API
- Health check do status da instância a cada 5 minutos
- Alerta visual imediato ao motorista se a instância desconectar
- Log de todas as chamadas à Evolution API e eventos de webhook

### PWA

- Instalável via "Adicionar à tela inicial"
- Ícone e splash screen configurados
- Atualização automática

### Escalabilidade

- Suportar até 100 motoristas simultâneos
- Até 50 passageiros por motorista por rota
- Índices no banco nas colunas de busca frequente (já definidos no BANCO.md)

---

## Telas do sistema — o que cada uma faz

| Tela | RF relacionados | Notas |
|---|---|---|
| Login | RF01 | Supabase Auth — não implementar JWT manual |
| Cadastro | RF02 | Chamar `criar_dados_iniciais_motorista` após criar conta |
| Dashboard | RF15, RF07 | Resumo do dia + acesso rápido |
| Passageiros (lista) | RF04, RF17 | Busca em tempo real e filtros operacionais por rota/status |
| Passageiro (form) | RF03, RF05 | Selecionar rota ao cadastrar |
| Rotas (lista + form) | RF18 | CRUD de rotas |
| Lista diária | RF07, RF08, RF13 | Atualiza via Realtime; checkbox manual |
| Templates | RF09 | Preview em tempo real da mensagem |
| WhatsApp | RF10, RF11, RF12 | QR Code, status, envio teste, logs |
| Configurações | RF19, RF12 | Horário automático por rota, toggle ativo |
| Histórico | RF14 | Opcional — filtro por passageiro e período |

---

## Fluxos principais — sequência de operações

### Fluxo automático (principal)
1. Cron `pg_cron` dispara a Edge Function `automacao-diaria` a cada minuto
2. `automacao-diaria` busca motoristas com `envio_automatico_ativo = true` cuja
   `horario_envio_automatico` bate **exatamente** com o minuto atual em São Paulo
3. Para cada rota ativa do motorista:
   - **Sem viagem hoje**: cria `viagem` + `confirmacoes pendentes` + envia
     `sendText` para cada passageiro ativo via Evolution API
   - **Com viagem hoje**: reenvia `sendText` apenas para confirmações
     `pendente` (cenário multi-pass)
4. Responsável digita o número da opção no WhatsApp
5. Evolution API chama webhook `webhook-evolution`
6. Edge Function identifica passageiro pelo telefone, atualiza
   `confirmacoes.status` e `tipo_confirmacao`, envia mensagem de retorno automática
7. Supabase Realtime notifica o PWA — lista atualiza ao vivo
8. Notificação `whatsapp_resposta` aparece no sino do dashboard

### Fluxo manual (complementar)
1. Motorista aperta "Iniciar rota" no PWA
2. Frontend valida via `validarRotaParaInicio` (ponto de saída, destinos,
   passageiros ativos, e se TODOS ainda não recusaram). Se todos disseram
   "não vai hoje", bloqueia abrir o Maps e mostra toast informativo
3. Frontend chama Edge Function `iniciar-viagem`
4. A partir daqui: mesmo que o fluxo automático (passos 3–8 acima)

### Botão Reenviar manual
1. Motorista vê passageiro pendente no PassengerCard
2. Aperta "Reenviar" → `reenviar-confirmacao` faz pre-flight de conexão e
   reenvia via `sendText` incrementando `mensagens.tentativas`

### Fallback sem WhatsApp
1. WhatsApp desconectado → sistema alerta motorista
2. Motorista marca presença manualmente via checkbox na lista diária
3. `confirmacoes.origem = 'manual'`, `status = 'confirmado'`
4. Sistema continua funcionando normalmente

---

## O que NÃO implementar (fora do escopo)

- Integração com mapas ou GPS para calcular distância entre paradas
- Pagamentos ou cobranças
- Chat entre motorista e responsável
- Notificações push (funcionalidade futura)
- Exportação para PDF (funcionalidade futura)
- WhatsApp Business API oficial (usa Evolution API não-oficial)
- Múltiplos usuários por conta de motorista


