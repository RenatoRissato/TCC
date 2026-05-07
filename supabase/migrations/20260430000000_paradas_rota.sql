-- =========================================================
-- Roteiro flexível por rota: passageiros e destinos intercalados
-- =========================================================
-- Mudanças:
-- 1) `rotas` ganha:
--      - ponto_saida   (endereço de partida da van — único, fixo no topo do roteiro)
--      - turno         ('morning' | 'afternoon' | 'night' — define cor/ícone, independe do nome)
-- 2) Nova tabela `paradas_rota`: lista ordenada de paradas heterogêneas
--      - tipo='embarque' → aponta para um passageiro (passageiro_id)
--      - tipo='destino'  → endereço livre (rotulo + endereco), ex: "Faculdade Brasil"
--    A mesma rota pode ter N destinos intercalados entre passageiros.
-- 3) Backfill:
--      - turno é inferido do nome para registros antigos (compatibilidade)
--      - cria 1 parada de embarque para cada passageiro existente, preservando ordem_na_rota
-- =========================================================

create extension if not exists "pgcrypto";

-- 1) Novas colunas em `rotas`
alter table rotas add column if not exists ponto_saida text;
alter table rotas add column if not exists turno       text not null default 'morning'
  check (turno in ('morning','afternoon','night'));

-- Backfill do turno baseado no nome (apenas registros que ainda estão no default)
update rotas set turno = 'afternoon'
  where lower(nome) like '%tarde%' and turno = 'morning';
update rotas set turno = 'night'
  where (lower(nome) like '%noite%' or lower(nome) like '%night%') and turno = 'morning';

-- 2) Tabela paradas_rota
create table if not exists paradas_rota (
  id              uuid primary key default gen_random_uuid(),
  rota_id         uuid not null references rotas(id) on delete cascade,
  ordem           integer not null,
  tipo            text not null check (tipo in ('embarque','destino')),
  passageiro_id   uuid references passageiros(id) on delete cascade,
  rotulo          text,
  endereco        text,
  criado_em       timestamptz not null default now(),
  unique (rota_id, ordem),
  -- Coerência: embarque exige passageiro_id; destino exige endereco
  check (
    (tipo = 'embarque' and passageiro_id is not null) or
    (tipo = 'destino'  and endereco is not null)
  )
);

create index if not exists idx_paradas_rota_rota_id on paradas_rota(rota_id);
create index if not exists idx_paradas_rota_passageiro_id on paradas_rota(passageiro_id);

-- 3) Backfill: cada passageiro vira uma parada de embarque preservando a ordem antiga
insert into paradas_rota (rota_id, ordem, tipo, passageiro_id)
select p.rota_id, p.ordem_na_rota, 'embarque', p.id
from passageiros p
where p.status = 'ativo'
  and not exists (
    select 1 from paradas_rota pr
    where pr.rota_id = p.rota_id and pr.passageiro_id = p.id
  )
  and not exists (
    select 1 from paradas_rota pr
    where pr.rota_id = p.rota_id and pr.ordem = p.ordem_na_rota
  )
on conflict (rota_id, ordem) do nothing;

-- 4) RLS
alter table paradas_rota enable row level security;

drop policy if exists "motorista_proprias_paradas" on paradas_rota;
create policy "motorista_proprias_paradas" on paradas_rota
  for all using (
    rota_id in (
      select r.id from rotas r join motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

-- 5) GRANTs
grant select, insert, update, delete on paradas_rota to authenticated;
