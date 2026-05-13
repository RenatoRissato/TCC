alter table public.configuracoes_automacao
  add column if not exists route_mode text not null default 'all',
  add column if not exists route_id uuid references public.rotas(id) on delete set null;

alter table public.configuracoes_automacao
  drop constraint if exists configuracoes_automacao_route_mode_check;

alter table public.configuracoes_automacao
  add constraint configuracoes_automacao_route_mode_check
  check (route_mode in ('all', 'specific'));

update public.configuracoes_automacao
set route_mode = 'all',
    route_id = null
where route_mode is null
   or route_mode not in ('all', 'specific')
   or route_mode = 'all';
