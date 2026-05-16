-- Coluna `direcao` em viagens: registra o sentido do trajeto escolhido pelo
-- motorista no momento do play.
--   'buscar'  → sai do ponto de partida da van, passa pelos passageiros e
--               termina no destino final (escola/faculdade).
--   'retorno' → sai do destino final, passa pelos passageiros em ordem
--               inversa e termina no ponto de partida.
--
-- Decisão: UMA viagem por (rota_id, data). Quando o motorista inicia a "ida"
-- de manhã e à tarde aperta "play" de novo escolhendo "retorno", atualizamos
-- a `direcao` da viagem existente (sem criar duplicata). A URL do Google
-- Maps é montada na hora pelo frontend com base na direção escolhida.

alter table viagens
  add column if not exists direcao text;

alter table viagens
  drop constraint if exists viagens_direcao_check;

alter table viagens
  add constraint viagens_direcao_check
  check (direcao is null or direcao in ('buscar', 'retorno'));
