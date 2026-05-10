-- =========================================================
-- Grants para o role `service_role`
-- =========================================================
-- Sintoma observado: a Edge Function `qr-code-whatsapp` falhava com
--   permission denied for table instancias_whatsapp
-- A dica do Postgres confirmou:
--   GRANT SELECT, INSERT, UPDATE ON public.instancias_whatsapp TO service_role;
--
-- Causa: a migration `20260429000000_grants_authenticated.sql` concedeu
-- DML para `authenticated`, mas NÃO concedeu para `service_role`. As Edge
-- Functions usam `criarClienteServico()` (service role) para fazer UPSERT
-- em tabelas restritas ao webhook/cron — quando a permissão de tabela
-- está ausente, o RLS-bypass do service_role não basta: o Postgres barra
-- antes mesmo de avaliar a policy.
--
-- Solução abrangente:
-- 1) GRANT ALL nas tabelas existentes para service_role
-- 2) ALTER DEFAULT PRIVILEGES para tabelas futuras pegarem o grant automático
-- 3) GRANT em sequences e functions também
-- =========================================================

-- 1) Tabelas existentes
grant select, insert, update, delete on all tables in schema public to service_role;

-- 2) Sequences (uuid_generate_v4 não usa, mas identity columns futuras vão usar)
grant usage, select, update on all sequences in schema public to service_role;

-- 3) Funções (RPC `criar_dados_iniciais_motorista` por exemplo)
grant execute on all functions in schema public to service_role;

-- 4) USAGE no schema (já é default, mas reafirma — barato)
grant usage on schema public to service_role;

-- 5) Default privileges: garante que toda tabela/sequence/function CRIADA
--    a partir de agora também receba grant para service_role automaticamente,
--    sem precisar de migration nova.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select, update on sequences to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;
