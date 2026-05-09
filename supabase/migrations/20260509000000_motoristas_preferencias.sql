-- =========================================================
-- Preferências do motorista (notificações + idioma)
-- =========================================================
-- Cardinalidade 1:1 com motoristas — colunas adicionais em vez
-- de tabela nova: 1 query a menos no carregamento do perfil e
-- a RLS já existente (motorista_proprio_perfil) cobre tudo.
-- =========================================================

alter table motoristas
  add column if not exists notif_whatsapp   boolean not null default true,
  add column if not exists notif_push       boolean not null default true,
  add column if not exists notif_pendentes  boolean not null default false,
  add column if not exists som_alerta       text    not null default 'default',
  add column if not exists idioma           text    not null default 'pt-BR';

comment on column motoristas.notif_whatsapp  is 'Recebe alerta in-app quando responsável responde no WhatsApp.';
comment on column motoristas.notif_push      is 'Push notifications habilitadas (futuro — UI já existe).';
comment on column motoristas.notif_pendentes is 'Lembrete 1h antes da rota para passageiros sem resposta.';
comment on column motoristas.som_alerta      is 'Som usado nos alertas in-app: default | chime | bell | ding | none.';
comment on column motoristas.idioma          is 'Idioma preferido da UI: pt-BR | en | es.';
