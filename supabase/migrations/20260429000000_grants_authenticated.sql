-- =========================================================
-- Concede privilégios de DML ao role `authenticated`
-- =========================================================
-- No Supabase, RLS sozinho NÃO basta: o role precisa primeiro
-- ter privilégio de DML (SELECT/INSERT/UPDATE/DELETE) na tabela
-- para que a query seja sequer tentada. Só então a RLS filtra
-- as linhas. A migration inicial habilitou RLS + policies, mas
-- esqueceu de conceder os privilégios — daí o erro 42501
-- "permission denied for table X" mesmo após login válido.
-- =========================================================

grant select, insert, update, delete on
  motoristas,
  rotas,
  passageiros,
  viagens,
  listas_diarias,
  confirmacoes,
  instancias_whatsapp,
  configuracoes_automacao,
  templates_mensagem,
  opcoes_resposta,
  mensagens,
  log_mensagens,
  historico_presenca
to authenticated;

-- Sequences (necessário se algum default usa nextval; uuid_generate_v4
-- não usa, mas deixamos por segurança caso futuras tabelas usem identity)
grant usage on all sequences in schema public to authenticated;
