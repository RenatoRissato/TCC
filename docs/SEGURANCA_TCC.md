# Seguranca aplicada para o TCC

Este documento resume o pacote enxuto de seguranca aplicado no SmartRoutes para
o contexto do TCC. A ideia foi corrigir pontos de alto valor sem mudar a
arquitetura inteira do sistema perto da entrega.

## O que foi corrigido agora

- O sistema deixou de salvar a lista completa de passageiros no `localStorage`.
- Caches antigos de passageiros com prefixo `sr_passageiros_*` sao removidos ao carregar a lista.
- A Edge Function `registrar-webhook` nao retorna mais a resposta bruta da Evolution API.
- `DEBUG_LOGS=false` e `DEBUG_ERRORS=false` permanecem como padrao recomendado.
- `APP_ORIGIN` continua documentado para restringir CORS no ambiente publicado.

## Por que isso melhora a seguranca

Antes, o cache local de passageiros podia manter no navegador dados como nome do
aluno, telefone, responsavel, endereco e status. Para um TCC isso pode parecer
pratico, mas aumenta o impacto caso o computador seja compartilhado, o navegador
tenha extensao maliciosa ou algum XSS apareca no futuro.

Ao carregar passageiros sempre do Supabase autenticado, o sistema reduz a
persistencia local de dados sensiveis.

A resposta bruta da Evolution API tambem foi removida do retorno do
`registrar-webhook`, evitando expor detalhes internos de configuracao para o
frontend.

## O que continua adequado para o TCC

- Supabase Auth controla login e sessao.
- RLS isola dados por motorista.
- Secrets sensiveis ficam nas Edge Functions, nao no frontend.
- Evolution API e Google Maps sao chamados no backend.
- Logs detalhados ficam desligados por padrao.
- Fotos de perfil usam bucket privado com URL assinada.

## O que ficou para melhoria futura

Estes itens sao recomendados para uma versao de producao, mas nao sao
obrigatorios para fechar o TCC:

- configurar CSP completa e headers de seguranca no provedor de deploy;
- adicionar assinatura HMAC/timestamp no webhook da Evolution API;
- aplicar rate limit nas Edge Functions expostas;
- mover todo CRUD de passageiros e rotas para Edge Functions;
- adotar politica de senha mais rigida;
- criar perfil administrativo para operacoes de manutencao, como registrar webhook.

## Conclusao

Para o TCC, o SmartRoutes agora cobre os pontos mais importantes sem adicionar
complexidade excessiva. As alteracoes reduzem exposicao de dados sensiveis no
navegador e evitam retorno desnecessario de informacoes internas da Evolution
API, mantendo o funcionamento atual do sistema.
