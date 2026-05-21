-- Adiciona nome_motorista denormalizado em rotas para facilitar inspecao
-- visual no Table Editor do Supabase. Mantido em sincronia por triggers
-- (nunca confiar em escrita manual do app — o trigger sempre recalcula
-- a partir de motoristas.nome via motorista_id).

-- 1) Coluna nova (nullable inicialmente pra permitir backfill antes do NOT NULL)
alter table public.rotas
  add column if not exists nome_motorista text;

-- 2) Backfill — popular as linhas existentes
update public.rotas r
   set nome_motorista = m.nome
  from public.motoristas m
 where r.motorista_id = m.id
   and r.nome_motorista is null;

-- 3) Agora todas as linhas tem valor — pode ficar NOT NULL
alter table public.rotas
  alter column nome_motorista set not null;

-- 4) Trigger em rotas: ao INSERT ou ao mudar motorista_id, recalcula
-- nome_motorista a partir do motorista referenciado. Sempre sobrescreve
-- (ignora qualquer valor que o app tenha passado — fonte unica de verdade
-- e motoristas.nome).
create or replace function public.rotas_sync_nome_motorista()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select m.nome
    into new.nome_motorista
    from public.motoristas m
   where m.id = new.motorista_id;
  return new;
end;
$$;

drop trigger if exists rotas_sync_nome_motorista_trigger on public.rotas;
create trigger rotas_sync_nome_motorista_trigger
  before insert or update of motorista_id
  on public.rotas
  for each row
  execute function public.rotas_sync_nome_motorista();

-- 5) Trigger em motoristas: ao mudar nome, propaga para todas as rotas
-- que referenciam esse motorista. Sem isso, nome_motorista ficaria
-- defasado quando o motorista editar o nome em Configuracoes -> Perfil.
create or replace function public.motoristas_propagar_nome_para_rotas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.nome is distinct from old.nome then
    update public.rotas
       set nome_motorista = new.nome
     where motorista_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists motoristas_propagar_nome_trigger on public.motoristas;
create trigger motoristas_propagar_nome_trigger
  after update of nome
  on public.motoristas
  for each row
  execute function public.motoristas_propagar_nome_para_rotas();
