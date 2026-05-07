-- =========================================================
-- Migração inicial — SmartRoutes
-- Ver detalhes em docs/banco.md
-- =========================================================

create extension if not exists "uuid-ossp";

-- ENUMs (idempotente via DO block)
do $$ begin
  create type status_rota as enum ('ativa', 'inativa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_passageiro as enum ('ativo', 'inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_viagem as enum ('agendada', 'em_andamento', 'finalizada', 'cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_confirmacao as enum ('pendente', 'confirmado', 'ausente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_confirmacao as enum ('ida_e_volta', 'somente_ida', 'somente_volta', 'nao_vai');
exception when duplicate_object then null; end $$;

do $$ begin
  create type origem_confirmacao as enum ('whatsapp', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_conexao as enum ('conectado', 'desconectado', 'conectando', 'aguardando_qr');
exception when duplicate_object then null; end $$;

do $$ begin
  create type direcao_mensagem as enum ('saida', 'entrada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_mensagem as enum ('confirmacao_diaria', 'resposta_confirmacao', 'resposta_invalida', 'avulsa', 'teste');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_envio as enum ('pendente', 'enviada', 'entregue', 'falha');
exception when duplicate_object then null; end $$;

-- Tabelas
create table if not exists motoristas (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  telefone    text,
  cnh         text,
  criado_em   timestamptz not null default now()
);

create table if not exists rotas (
  id              uuid primary key default uuid_generate_v4(),
  motorista_id    uuid not null references motoristas(id) on delete cascade,
  nome            text not null,
  descricao       text,
  horario_saida   time,
  status          status_rota not null default 'ativa',
  criada_em       timestamptz not null default now()
);

create table if not exists passageiros (
  id                    uuid primary key default uuid_generate_v4(),
  rota_id               uuid not null references rotas(id) on delete cascade,
  nome_completo         text not null,
  telefone_responsavel  text not null,
  endereco_embarque     text not null,
  ponto_referencia      text,
  turno                 text,
  horario_embarque      time,
  ordem_na_rota         integer not null default 1,
  observacoes           text,
  status                status_passageiro not null default 'ativo',
  criado_em             timestamptz not null default now()
);

create table if not exists viagens (
  id              uuid primary key default uuid_generate_v4(),
  rota_id         uuid not null references rotas(id) on delete cascade,
  data            date not null default current_date,
  status          status_viagem not null default 'em_andamento',
  iniciada_em     timestamptz not null default now(),
  finalizada_em   timestamptz,
  unique (rota_id, data)
);

create table if not exists listas_diarias (
  id          uuid primary key default uuid_generate_v4(),
  viagem_id   uuid not null unique references viagens(id) on delete cascade,
  gerada_em   timestamptz not null default now()
);

create table if not exists confirmacoes (
  id                  uuid primary key default uuid_generate_v4(),
  viagem_id           uuid not null references viagens(id) on delete cascade,
  passageiro_id       uuid not null references passageiros(id) on delete cascade,
  tipo_confirmacao    tipo_confirmacao,
  status              status_confirmacao not null default 'pendente',
  origem              origem_confirmacao,
  criada_em           timestamptz not null default now(),
  respondida_em       timestamptz,
  unique (viagem_id, passageiro_id)
);

create table if not exists instancias_whatsapp (
  id                        uuid primary key default uuid_generate_v4(),
  motorista_id              uuid not null unique references motoristas(id) on delete cascade,
  status_conexao            status_conexao not null default 'desconectado',
  numero_conta              text,
  nome_conta_wa             text,
  data_ultima_conexao       timestamptz,
  total_mensagens_enviadas  integer not null default 0
);

create table if not exists configuracoes_automacao (
  id                        uuid primary key default uuid_generate_v4(),
  instancia_whatsapp_id     uuid not null unique references instancias_whatsapp(id) on delete cascade,
  envio_automatico_ativo    boolean not null default false,
  horario_envio_automatico  time,
  horario_limite_resposta   time,
  saudacao_personalizada    text,
  max_tentativas_envio      integer not null default 3,
  intervalo_tentativas      integer not null default 30
);

create table if not exists templates_mensagem (
  id            uuid primary key default uuid_generate_v4(),
  motorista_id  uuid not null unique references motoristas(id) on delete cascade,
  cabecalho     text not null default 'Bom dia! Confirmação de presença na van escolar.',
  rodape        text not null default 'Responda com o número da opção desejada.',
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists opcoes_resposta (
  id                  uuid primary key default uuid_generate_v4(),
  template_id         uuid not null references templates_mensagem(id) on delete cascade,
  numero              integer not null check (numero between 1 and 4),
  texto_exibido       text not null,
  tipo_confirmacao    tipo_confirmacao not null,
  ativo               boolean not null default true,
  unique (template_id, numero)
);

create table if not exists mensagens (
  id                    uuid primary key default uuid_generate_v4(),
  instancia_whatsapp_id uuid references instancias_whatsapp(id) on delete set null,
  passageiro_id         uuid references passageiros(id) on delete set null,
  confirmacao_id        uuid references confirmacoes(id) on delete set null,
  conteudo              text not null,
  direcao               direcao_mensagem not null,
  tipo                  tipo_mensagem not null,
  status_envio          status_envio not null default 'pendente',
  whatsapp_message_id   text,
  tentativas            integer not null default 0,
  enviada_em            timestamptz not null default now(),
  resposta_recebida_em  timestamptz
);

create table if not exists log_mensagens (
  id            uuid primary key default uuid_generate_v4(),
  mensagem_id   uuid not null references mensagens(id) on delete cascade,
  evento        text not null,
  data_hora     timestamptz not null default now(),
  detalhes      text
);

create table if not exists historico_presenca (
  id                uuid primary key default uuid_generate_v4(),
  passageiro_id     uuid not null references passageiros(id) on delete cascade,
  viagem_id         uuid not null references viagens(id) on delete cascade,
  data              date not null,
  status_final      status_confirmacao not null,
  tipo_confirmacao  tipo_confirmacao,
  registrado_em     timestamptz not null default now(),
  unique (passageiro_id, viagem_id)
);

-- Índices
create index if not exists idx_rotas_motorista_id on rotas(motorista_id);
create index if not exists idx_passageiros_rota_id on passageiros(rota_id);
create index if not exists idx_viagens_rota_id on viagens(rota_id);
create index if not exists idx_viagens_data on viagens(data);
create index if not exists idx_confirmacoes_viagem_id on confirmacoes(viagem_id);
create index if not exists idx_confirmacoes_passageiro_id on confirmacoes(passageiro_id);
create index if not exists idx_confirmacoes_status on confirmacoes(status);
create index if not exists idx_mensagens_confirmacao_id on mensagens(confirmacao_id);
create index if not exists idx_mensagens_passageiro_id on mensagens(passageiro_id);
create index if not exists idx_historico_passageiro_data on historico_presenca(passageiro_id, data);

-- Triggers
create or replace function atualizar_timestamp()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_template_atualizado on templates_mensagem;
create trigger trigger_template_atualizado
  before update on templates_mensagem
  for each row execute function atualizar_timestamp();

create or replace function popular_historico_ao_finalizar()
returns trigger as $$
begin
  if new.status = 'finalizada' and old.status != 'finalizada' then
    insert into historico_presenca (passageiro_id, viagem_id, data, status_final, tipo_confirmacao)
    select c.passageiro_id, c.viagem_id, new.data, c.status, c.tipo_confirmacao
    from confirmacoes c
    where c.viagem_id = new.id
    on conflict (passageiro_id, viagem_id) do update
      set status_final = excluded.status_final,
          tipo_confirmacao = excluded.tipo_confirmacao;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_finalizar_viagem on viagens;
create trigger trigger_finalizar_viagem
  after update on viagens
  for each row execute function popular_historico_ao_finalizar();

-- RLS
alter table motoristas enable row level security;
alter table rotas enable row level security;
alter table passageiros enable row level security;
alter table viagens enable row level security;
alter table listas_diarias enable row level security;
alter table confirmacoes enable row level security;
alter table instancias_whatsapp enable row level security;
alter table configuracoes_automacao enable row level security;
alter table templates_mensagem enable row level security;
alter table opcoes_resposta enable row level security;
alter table mensagens enable row level security;
alter table log_mensagens enable row level security;
alter table historico_presenca enable row level security;

drop policy if exists "motorista_proprio_perfil" on motoristas;
create policy "motorista_proprio_perfil" on motoristas
  for all using (user_id = auth.uid());

drop policy if exists "motorista_proprias_rotas" on rotas;
create policy "motorista_proprias_rotas" on rotas
  for all using (motorista_id in (select id from motoristas where user_id = auth.uid()));

drop policy if exists "motorista_proprios_passageiros" on passageiros;
create policy "motorista_proprios_passageiros" on passageiros
  for all using (
    rota_id in (
      select r.id from rotas r join motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_proprias_viagens" on viagens;
create policy "motorista_proprias_viagens" on viagens
  for all using (
    rota_id in (
      select r.id from rotas r join motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_proprias_listas" on listas_diarias;
create policy "motorista_proprias_listas" on listas_diarias
  for all using (
    viagem_id in (
      select v.id from viagens v
      join rotas r on r.id = v.rota_id
      join motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_proprias_confirmacoes" on confirmacoes;
create policy "motorista_proprias_confirmacoes" on confirmacoes
  for all using (
    viagem_id in (
      select v.id from viagens v
      join rotas r on r.id = v.rota_id
      join motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_propria_instancia" on instancias_whatsapp;
create policy "motorista_propria_instancia" on instancias_whatsapp
  for all using (motorista_id in (select id from motoristas where user_id = auth.uid()));

drop policy if exists "motorista_propria_configuracao" on configuracoes_automacao;
create policy "motorista_propria_configuracao" on configuracoes_automacao
  for all using (
    instancia_whatsapp_id in (
      select i.id from instancias_whatsapp i
      join motoristas m on m.id = i.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_proprio_template" on templates_mensagem;
create policy "motorista_proprio_template" on templates_mensagem
  for all using (motorista_id in (select id from motoristas where user_id = auth.uid()));

drop policy if exists "motorista_proprias_opcoes" on opcoes_resposta;
create policy "motorista_proprias_opcoes" on opcoes_resposta
  for all using (
    template_id in (
      select t.id from templates_mensagem t
      join motoristas m on m.id = t.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_proprias_mensagens" on mensagens;
create policy "motorista_proprias_mensagens" on mensagens
  for all using (
    passageiro_id in (
      select p.id from passageiros p
      join rotas r on r.id = p.rota_id
      join motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_proprios_logs" on log_mensagens;
create policy "motorista_proprios_logs" on log_mensagens
  for all using (
    mensagem_id in (
      select ms.id from mensagens ms
      join passageiros p on p.id = ms.passageiro_id
      join rotas r on r.id = p.rota_id
      join motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_proprio_historico" on historico_presenca;
create policy "motorista_proprio_historico" on historico_presenca
  for all using (
    passageiro_id in (
      select p.id from passageiros p
      join rotas r on r.id = p.rota_id
      join motoristas m on m.id = r.motorista_id
      where m.user_id = auth.uid()
    )
  );

-- Realtime
do $$ begin
  alter publication supabase_realtime add table confirmacoes;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table viagens;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table instancias_whatsapp;
exception when others then null; end $$;

-- Função: criar dados iniciais do motorista
create or replace function criar_dados_iniciais_motorista(p_motorista_id uuid)
returns void as $$
declare
  v_instancia_id uuid;
  v_template_id uuid;
begin
  insert into instancias_whatsapp (motorista_id)
  values (p_motorista_id)
  on conflict (motorista_id) do update set motorista_id = excluded.motorista_id
  returning id into v_instancia_id;

  insert into configuracoes_automacao (instancia_whatsapp_id)
  values (v_instancia_id)
  on conflict (instancia_whatsapp_id) do nothing;

  insert into templates_mensagem (motorista_id, cabecalho, rodape)
  values (
    p_motorista_id,
    'Bom dia! Confirmação de presença na van escolar para hoje.',
    'Aguardo sua resposta. Obrigado!'
  )
  on conflict (motorista_id) do update set motorista_id = excluded.motorista_id
  returning id into v_template_id;

  insert into opcoes_resposta (template_id, numero, texto_exibido, tipo_confirmacao) values
    (v_template_id, 1, 'Ida e volta', 'ida_e_volta'),
    (v_template_id, 2, 'Somente ida', 'somente_ida'),
    (v_template_id, 3, 'Somente volta', 'somente_volta'),
    (v_template_id, 4, 'Não vai hoje', 'nao_vai')
  on conflict (template_id, numero) do nothing;
end;
$$ language plpgsql security definer;

grant execute on function criar_dados_iniciais_motorista(uuid) to authenticated;
