# REQUISITOS.md — SmartRoute

## Como usar este arquivo

Este arquivo é a referência de requisitos para implementação. Leia antes de gerar qualquer código de funcionalidade. As regras de negócio (RNs) são especialmente importantes — elas definem comportamentos que não são óbvios só olhando o banco.

---

## Módulos do sistema — visão geral

| Módulo | RF | Prioridade | Complexidade | Status |
|---|---|---|---|---|
| Autenticação | RF01, RF02 | Alta | Média | Implementar |
| Gestão de rotas | RF18 | Alta | Baixa | Implementar |
| Gestão de passageiros | RF03, RF04, RF05, RF06, RF17 | Alta | Baixa/Média | Implementar |
| Lista diária | RF07, RF08 | Alta | Alta | Implementar |
| Templates de mensagem | RF09 | Alta | Média | Implementar |
| Integração WhatsApp | RF10, RF11, RF12 | Alta/Média | Alta | Implementar via Edge Functions |
| Automação de envio | RF19 | Alta | Alta | Implementar via cron job Supabase |
| Visualização de rota | RF13 | Média | Média | Implementar |
| Histórico de presenças | RF14 | Média | Média | Opcional |
| Dashboard | RF15 | Média | Baixa | Opcional |
| Logout | RF16 | Alta | Baixa | Implementar |

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
- **RN14** — Exclusão é sempre lógica (`status = inativo`). Nunca deletar fisicamente do banco
- **RN15** — Passageiro inativo não aparece na lista diária nem recebe mensagem WhatsApp
- **RN16** — Histórico de passageiro inativo permanece acessível

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
- **RN27** — Substituir `{nome_passageiro}` e `{data_formatada}` antes de enviar qualquer mensagem
- **RN28** — Alterações no template afetam apenas mensagens enviadas a partir daquele momento

**Template padrão:**
```
Boa noite, {nome_passageiro}!
Confirme o transporte escolar de amanhã ({data_formatada}):
1 - Vou na ida e na volta
2 - Vou apenas na ida
3 - Vou apenas na volta
4 - Não vou hoje
Por favor, responda até 20h.
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

### Mensagem de lista interativa (sendList)

- **Usar `sendList` da Evolution API** — não enviar texto simples com números
- Responsável **toca** em uma opção da lista — não precisa digitar nada
- Resposta identificada pelo `rowId` no formato `{numero}_{confirmacao_id}` (ex: `1_uuid-da-confirmacao`)
- Ao receber webhook, extrair o `rowId`, separar no underscore e mapear:
  - `1` → `ida_e_volta`
  - `2` → `somente_ida`
  - `3` → `somente_volta`
  - `4` → `nao_vai`
- **RN43** — Uma mensagem de confirmação de retorno por resposta válida recebida
- **RN44** — Respostas após o horário limite são aceitas mas geram alerta

### Automação de envio (diferencial principal)

- **RN66** — Cada rota tem seu próprio horário de envio configurado em `configuracoes_automacao`
- **RN67** — Horários configuráveis entre 05:00 e 22:00 apenas
- **RN68** — Envio automático só para passageiros ativos da rota
- **RN69** — Se WhatsApp desconectado no horário, alertar motorista em vez de falhar silenciosamente
- **RN70** — Motorista não precisa abrir o app para o envio ocorrer (cron job roda no servidor)
- Não criar viagem duplicada se já existir uma para aquela rota no dia

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
- **RN58** — Passageiros inativos têm histórico preservado
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
| Passageiros (lista) | RF04, RF17 | Filtro ativo/inativo, busca em tempo real |
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
1. Cron job dispara no horário configurado por rota
2. Edge Function `automacao-diaria` verifica rotas com `envio_automatico_ativo = true`
3. Para cada rota elegível sem viagem no dia: cria `viagem` + `confirmacoes` (uma por passageiro ativo)
4. Chama Evolution API com `sendList` para cada passageiro
5. Responsável toca na opção no WhatsApp
6. Evolution API chama webhook `webhook-evolution`
7. Edge Function atualiza `confirmacoes.status` e `tipo_confirmacao`
8. Supabase Realtime notifica o PWA — lista atualiza ao vivo

### Fluxo manual (complementar)
1. Motorista aperta "Iniciar rota" no PWA
2. Frontend chama Edge Function `iniciar-viagem`
3. A partir daqui: mesmo que o fluxo automático (passos 3–8 acima)

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