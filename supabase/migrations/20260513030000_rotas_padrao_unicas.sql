-- Remove duplicidades legadas das rotas padrão e impede novos duplicados
-- por motorista/turno.

update rotas
set turno = case
  when lower(nome) like '%tarde%' then 'afternoon'
  when lower(nome) like '%noite%' or lower(nome) like '%night%' then 'night'
  else 'morning'
end
where turno is null;

with duplicadas as (
  select id
  from (
    select
      id,
      row_number() over (
        partition by motorista_id, turno
        order by criada_em asc, id asc
      ) as rn
    from rotas
  ) ranked
  where rn > 1
)
delete from rotas
where id in (select id from duplicadas);

create unique index if not exists idx_rotas_motorista_turno_unique
  on rotas (motorista_id, turno);
