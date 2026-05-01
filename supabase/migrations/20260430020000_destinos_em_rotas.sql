-- =========================================================
-- Destinos múltiplos como JSONB array em `rotas`
-- =========================================================
-- Substitui o modelo de `paradas_rota` (lista intercalada de paradas)
-- por um modelo mais simples: rota tem N destinos cadastrados, e os
-- passageiros viram waypoints automáticos no Google Maps.
--
-- Estrutura de cada destino:
--   { "rotulo": "Faculdade Brasil", "rua": "...", "numero": "...",
--     "bairro": "...", "cep": "..." }
-- =========================================================

-- 1) Nova coluna em `rotas`
alter table rotas
  add column if not exists destinos jsonb not null default '[]'::jsonb;

-- 2) Drop da tabela paradas_rota (com cascade para policies/indexes)
drop table if exists paradas_rota cascade;
