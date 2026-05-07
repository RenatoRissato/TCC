-- =========================================================
-- Notificações in-app (sino do dashboard)
-- =========================================================
-- Geradas automaticamente pelas Edge Functions:
--   webhook-evolution → tipo 'whatsapp_resposta'
--   iniciar-viagem    → tipo 'viagem_iniciada'
--   finalizar-viagem  → tipo 'viagem_finalizada'
-- INSERT é restrito ao service role (sem policy de insert para authenticated).
-- O motorista só pode SELECT/UPDATE suas próprias notificações.
-- =========================================================

do $$ begin
  create type tipo_notificacao as enum (
    'whatsapp_resposta',
    'viagem_iniciada',
    'viagem_finalizada'
  );
exception when duplicate_object then null; end $$;

create table if not exists notificacoes (
  id            uuid primary key default gen_random_uuid(),
  motorista_id  uuid not null references motoristas(id) on delete cascade,
  titulo        text not null,
  mensagem      text not null,
  tipo          tipo_notificacao not null,
  lida          boolean not null default false,
  criada_em     timestamptz not null default now()
);

create index if not exists idx_notificacoes_motorista_recentes
  on notificacoes (motorista_id, criada_em desc);

create index if not exists idx_notificacoes_nao_lidas
  on notificacoes (motorista_id) where lida = false;

-- Privilégios DML ao role authenticated (insert NÃO é concedido —
-- somente service role insere via Edge Function)
grant select, update on notificacoes to authenticated;

alter table notificacoes enable row level security;

drop policy if exists "motorista_proprias_notificacoes_select" on notificacoes;
create policy "motorista_proprias_notificacoes_select" on notificacoes
  for select using (
    motorista_id in (select id from motoristas where user_id = auth.uid())
  );

drop policy if exists "motorista_proprias_notificacoes_update" on notificacoes;
create policy "motorista_proprias_notificacoes_update" on notificacoes
  for update using (
    motorista_id in (select id from motoristas where user_id = auth.uid())
  )
  with check (
    motorista_id in (select id from motoristas where user_id = auth.uid())
  );

-- Realtime (para escutar INSERTs do service role)
do $$ begin
  alter publication supabase_realtime add table notificacoes;
exception when others then null; end $$;
