-- Evita que o fallback de criacao de rotas padrao gere duas rotas ativas
-- com o mesmo nome para o mesmo motorista. Mantem multiplas rotas por turno
-- permitidas, desde que os nomes sejam diferentes.

with ranked as (
  select
    r.id,
    row_number() over (
      partition by r.motorista_id, lower(btrim(r.nome))
      order by
        (select count(*) from public.passageiros p where p.rota_id = r.id and p.status = 'ativo') desc,
        r.criada_em asc,
        r.id asc
    ) as rn
  from public.rotas r
  where r.status = 'ativa'
)
update public.rotas r
set status = 'inativa'
from ranked
where ranked.id = r.id
  and ranked.rn > 1;

create unique index if not exists idx_rotas_motorista_nome_ativo_unique
  on public.rotas (motorista_id, lower(btrim(nome)))
  where status = 'ativa';
