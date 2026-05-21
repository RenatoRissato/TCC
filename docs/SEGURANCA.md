# Segurança do SmartRoutes

Este documento explica por que o SmartRoutes foi estruturado com práticas de
segurança adequadas para um sistema escolar e quais alterações recentes foram
feitas para reduzir riscos de vazamento, acesso indevido e exposição de dados.

O sistema lida com dados sensíveis de motoristas, alunos, responsáveis,
telefones, endereços, rotas, confirmações diárias e mensagens de WhatsApp.
Por isso, a segurança foi tratada em camadas: autenticação, permissões no banco,
Edge Functions, logs, variáveis de ambiente, integração com WhatsApp e storage.

## Resumo do nível de segurança

O SmartRoutes não depende apenas do frontend para proteger os dados. As regras
principais passam pelo Supabase Auth, pelas políticas de RLS no banco e pelas
Edge Functions, que executam operações sensíveis no backend.

As melhorias recentes reforçaram principalmente:

- redução de logs sensíveis em produção;
- respostas de erro mais seguras;
- CORS configurável por domínio;
- validação dos eventos aceitos no webhook da Evolution API;
- proteção maior para fotos de perfil;
- documentação das variáveis e cuidados de privacidade;
- atualização de dependências com `npm audit`.

## Autenticação e isolamento por motorista

O acesso ao sistema é feito com Supabase Auth. Cada usuário autenticado possui
um vínculo com um registro de motorista.

As consultas principais são filtradas por `motorista_id`, evitando que um
motorista visualize ou altere dados pertencentes a outro motorista. Esse
isolamento é reforçado pelas políticas de RLS do Supabase e pelo uso de Edge
Functions para operações mais sensíveis.

Na prática, isso protege dados como:

- alunos cadastrados;
- responsáveis e telefones;
- rotas;
- viagens;
- confirmações;
- mensagens;
- configurações de WhatsApp.

## Uso seguro do Supabase

O frontend usa a chave pública `anon`, que é esperada em aplicações Supabase.
Essa chave não deve ser confundida com a `service_role`, que precisa ficar
somente no backend.

As operações que exigem mais privilégio usam Edge Functions, não o navegador.
Isso evita expor permissões administrativas no client.

O projeto também possui grants específicos para `service_role` nas migrations,
permitindo que as Edge Functions executem tarefas necessárias sem liberar esse
poder diretamente para o usuário final.

## Proteção dos logs

Uma das principais melhorias recentes foi impedir que dados sensíveis apareçam
em logs de produção.

Foram criados helpers de log seguro:

- `supabase/functions/_shared/safeLog.ts`
- `src/app/utils/clientLogger.ts`

Esses helpers reduzem o risco de expor:

- telefone de responsável;
- nome de aluno ou responsável;
- texto recebido pelo WhatsApp;
- conteúdo de mensagens enviadas;
- IDs internos;
- stack traces;
- respostas completas de APIs externas.

Nas Edge Functions, logs detalhados só são emitidos quando `DEBUG_LOGS=true`.
No frontend, logs detalhados ficam restritos ao ambiente de desenvolvimento.

## Erros mais seguros em produção

As respostas de erro das Edge Functions foram ajustadas para não devolver
detalhes técnicos por padrão.

Antes, um erro interno poderia revelar informações úteis para depuração, mas
arriscadas em produção. Agora, a resposta padrão é genérica:

```json
{
  "erro": "Erro interno do servidor"
}
```

Detalhes técnicos só são retornados se a variável `DEBUG_ERRORS=true` estiver
configurada explicitamente. Em produção, o recomendado é manter:

```env
DEBUG_ERRORS=false
DEBUG_LOGS=false
```

## CORS configurável

O CORS das Edge Functions passou a usar a variável `APP_ORIGIN`.

Isso permite restringir quais domínios podem chamar as funções no ambiente de
produção. Em desenvolvimento, o fallback continua permitindo testes locais.

Exemplo recomendado em produção:

```env
APP_ORIGIN=https://seu-dominio.com
```

Essa alteração reduz o risco de chamadas indevidas feitas por páginas externas.

## Segurança na Evolution API e WhatsApp

A integração com WhatsApp usa a Evolution API por meio de Edge Functions. Isso
evita colocar `EVOLUTION_API_KEY`, URL da Evolution e nome da instância no
frontend.

As melhorias recentes reforçaram os fluxos de:

- webhook de mensagens recebidas;
- envio automático diário;
- reenvio de confirmação;
- QR Code de conexão;
- desconexão do WhatsApp;
- registro do webhook.

O registro de webhook agora valida os eventos recebidos contra uma lista de
eventos permitidos. Isso evita configurar eventos arbitrários ou inesperados.

Além disso, os logs do webhook foram ajustados para não registrar o texto real
das mensagens recebidas em produção.

## Fotos de perfil

As fotos de perfil foram movidas para um modelo mais seguro.

Antes, a foto podia ser tratada como URL pública. Agora, o sistema passa a usar
storage privado com URLs assinadas.

Foi criada a migration:

```txt
supabase/migrations/20260520180000_profile_photos_private.sql
```

Ela ajusta o bucket `profile-photos` para privado e reforça as policies para
permitir acesso apenas à própria foto do motorista.

Isso reduz o risco de uma imagem de perfil ficar acessível publicamente sem
controle.

## Dados de alunos, responsáveis e rotas

O sistema armazena e manipula informações sensíveis, como:

- nome de aluno;
- telefone do responsável;
- endereço;
- escola ou instituição;
- rota vinculada;
- status de confirmação diária;
- histórico de mensagens.

Esses dados são protegidos por autenticação, filtros por motorista e políticas
de acesso no banco.

Também foi documentado que a otimização de rota pode enviar endereços para
serviços externos, como Google Routes API ou OpenStreetMap/OSRM. Esse ponto é
importante para transparência e privacidade.

## Dependências

Foi executado `npm audit fix` com cuidado para reduzir vulnerabilidades
conhecidas nas dependências.

Depois das correções, a auditoria retornou:

```txt
found 0 vulnerabilities
```

Também foram executados:

```txt
npm run build
npm test
```

O build passou e os testes automatizados também passaram.

## Alterações recentes de segurança

As principais alterações feitas para reforçar a segurança foram:

- criação de `safeLog.ts` para logs seguros nas Edge Functions;
- criação de `clientLogger.ts` para logs seguros no frontend;
- remoção de logs diretos com dados sensíveis;
- mascaramento de telefones em logs técnicos;
- ocultação de texto de mensagens do WhatsApp nos logs;
- retorno genérico de erros internos por padrão;
- uso de `DEBUG_LOGS` para habilitar logs detalhados apenas quando necessário;
- uso de `DEBUG_ERRORS` para controlar detalhes técnicos em respostas 500;
- uso de `APP_ORIGIN` para restringir CORS em produção;
- validação de eventos permitidos no registro de webhook da Evolution API;
- uso de bucket privado e URL assinada para foto de perfil;
- atualização da documentação de ambiente e privacidade;
- atualização do lockfile após auditoria de dependências.

## Limitações e cuidados futuros

Mesmo com essas melhorias, segurança não é algo definitivo. O sistema deve
continuar sendo revisado conforme evoluir.

Pontos recomendados para próximas fases:

- validar as Edge Functions com Deno no ambiente local ou CI;
- manter `DEBUG_LOGS=false` e `DEBUG_ERRORS=false` em produção;
- configurar `APP_ORIGIN` com o domínio real do frontend;
- revisar periodicamente as policies RLS;
- evitar salvar dados sensíveis desnecessários no navegador;
- revisar permissões de storage sempre que novos buckets forem criados;
- documentar claramente para usuários que endereços podem ser enviados para APIs
  externas durante a otimização de rota;
- rodar `npm audit` antes de cada entrega importante.

## Conclusão

O SmartRoutes é mais seguro porque separa responsabilidades entre frontend,
banco e Edge Functions, usa autenticação com Supabase, aplica isolamento por
motorista e evita expor segredos no navegador.

As alterações recentes fortaleceram pontos críticos para produção: logs,
erros, CORS, webhook, storage de fotos e dependências. Isso torna o sistema mais
adequado para lidar com dados escolares sensíveis dentro do contexto do TCC.
