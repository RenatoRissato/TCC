create table if not exists public.configuracoes_automacao_rotas (
  id                    uuid primary key default gen_random_uuid(),
  instancia_whatsapp_id uuid not null references public.instancias_whatsapp(id) on delete cascade,
  rota_id               uuid not null references public.rotas(id) on delete cascade,
  envio_automatico_ativo boolean not null default true,
  horario_envio         time not null,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  unique (instancia_whatsapp_id, rota_id)
);

create index if not exists idx_config_automacao_rotas_instancia
  on public.configuracoes_automacao_rotas(instancia_whatsapp_id);

create index if not exists idx_config_automacao_rotas_rota
  on public.configuracoes_automacao_rotas(rota_id);

alter table public.configuracoes_automacao_rotas enable row level security;

drop policy if exists "motorista_proprias_configuracoes_automacao_rotas"
  on public.configuracoes_automacao_rotas;

create policy "motorista_proprias_configuracoes_automacao_rotas"
  on public.configuracoes_automacao_rotas
  for all
  using (
    instancia_whatsapp_id in (
      select i.id
      from public.instancias_whatsapp i
      join public.motoristas m on m.id = i.motorista_id
      where m.user_id = auth.uid()
    )
    and rota_id in (
      select r.id
      from public.rotas r
      join public.motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  )
  with check (
    instancia_whatsapp_id in (
      select i.id
      from public.instancias_whatsapp i
      join public.motoristas m on m.id = i.motorista_id
      where m.user_id = auth.uid()
    )
    and rota_id in (
      select r.id
      from public.rotas r
      join public.motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop trigger if exists trigger_config_automacao_rotas_atualizado
  on public.configuracoes_automacao_rotas;

create trigger trigger_config_automacao_rotas_atualizado
  before update on public.configuracoes_automacao_rotas
  for each row execute function public.atualizar_timestamp();

grant select, insert, update, delete
  on public.configuracoes_automacao_rotas
  to authenticated;

grant select, insert, update, delete
  on public.configuracoes_automacao_rotas
  to service_role;
