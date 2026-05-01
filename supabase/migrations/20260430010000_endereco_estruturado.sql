-- =========================================================
-- Endereço estruturado do ponto de saída da van
-- =========================================================
-- Substitui a coluna `ponto_saida` (string livre) por 4 campos:
--   - ponto_saida_rua     (text)
--   - ponto_saida_numero  (text — suporta "123A", "S/N")
--   - ponto_saida_bairro  (text)
--   - ponto_saida_cep     (text — com ou sem hífen)
--
-- O frontend concatena os 4 ao montar a URL do Google Maps.
-- =========================================================

-- 1) Novas colunas
alter table rotas add column if not exists ponto_saida_rua    text;
alter table rotas add column if not exists ponto_saida_numero text;
alter table rotas add column if not exists ponto_saida_bairro text;
alter table rotas add column if not exists ponto_saida_cep    text;

-- 2) Backfill: se algum registro tinha ponto_saida preenchido, copia para `rua`
--    como aproximação. O motorista pode reorganizar pelo modal depois.
update rotas
   set ponto_saida_rua = ponto_saida
 where ponto_saida is not null
   and ponto_saida_rua is null;

-- 3) Remove a coluna antiga
alter table rotas drop column if exists ponto_saida;
