create table if not exists public.conversas_confirmacao_whatsapp (
  id uuid primary key default gen_random_uuid(),
  passageiro_id uuid not null references public.passageiros(id) on delete cascade,
  viagem_id uuid references public.viagens(id) on delete cascade,
  confirmacao_id uuid references public.confirmacoes(id) on delete cascade,
  data date not null default current_date,
  estado text not null default 'sem_resposta',
  tipo_confirmacao_anterior tipo_confirmacao,
  alterada boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (passageiro_id, data),
  constraint conversas_confirmacao_estado_check
    check (estado in (
      'sem_resposta',
      'confirmado',
      'aguardando_decisao',
      'aguardando_nova_resposta'
    ))
);

create index if not exists idx_conversas_confirmacao_passageiro_data
  on public.conversas_confirmacao_whatsapp(passageiro_id, data);

create index if not exists idx_conversas_confirmacao_confirmacao_id
  on public.conversas_confirmacao_whatsapp(confirmacao_id);

alter table public.conversas_confirmacao_whatsapp enable row level security;

grant all on table public.conversas_confirmacao_whatsapp to service_role;
