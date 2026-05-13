-- =========================================================
-- Cron da automacao diaria a cada 5 minutos
-- =========================================================
-- Motivo: a Edge Function `automacao-diaria` precisa rodar com frequencia
-- para:
--   1. disparar mensagens perto do horario configurado pelo motorista;
--   2. aplicar `horario_limite_resposta`, marcando pendentes como ausentes.
--
-- Seguranca: o CRON_SECRET nao fica versionado. A migration tenta ler o
-- secret `smartroutes_cron_secret` do Supabase Vault. Caso ainda nao exista,
-- ela deixa uma funcao auxiliar para configurar o job manualmente:
--
--   select public.configurar_cron_automacao_diaria_5min('SEU_CRON_SECRET');
--
-- Antes disso, se preferir Vault:
--   select vault.create_secret('SEU_CRON_SECRET', 'smartroutes_cron_secret');
-- =========================================================

do $$ begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'Nao foi possivel criar pg_net automaticamente: %', sqlerrm;
end $$;

do $$ begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'Nao foi possivel criar pg_cron automaticamente: %', sqlerrm;
end $$;

create or replace function public.configurar_cron_automacao_diaria_5min(
  p_cron_secret text,
  p_project_url text default 'https://fbrepsmavjeokfucppio.supabase.co'
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_jobname constant text := 'automacao-diaria-smartroute';
  v_url text := rtrim(p_project_url, '/') || '/functions/v1/automacao-diaria';
begin
  if p_cron_secret is null or btrim(p_cron_secret) = '' then
    raise exception 'CRON_SECRET obrigatorio para configurar o cron da automacao diaria';
  end if;

  if to_regnamespace('cron') is null then
    raise exception 'Schema cron nao encontrado. Habilite a extensao pg_cron no Supabase.';
  end if;

  if to_regnamespace('net') is null then
    raise exception 'Schema net nao encontrado. Habilite a extensao pg_net no Supabase.';
  end if;

  if exists (select 1 from cron.job where jobname = v_jobname) then
    perform cron.unschedule(v_jobname);
  end if;

  perform cron.schedule(
    v_jobname,
    '*/5 * * * *',
    format(
      $cron$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        body := '{}'::jsonb
      );
      $cron$,
      v_url,
      p_cron_secret
    )
  );
end;
$$;

comment on function public.configurar_cron_automacao_diaria_5min(text, text)
  is 'Agenda automacao-diaria a cada 5 minutos sem versionar o CRON_SECRET.';

do $$
declare
  v_secret text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise notice 'Supabase Vault nao encontrado. Rode: select public.configurar_cron_automacao_diaria_5min(''SEU_CRON_SECRET'');';
    return;
  end if;

  execute
    'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into v_secret
    using 'smartroutes_cron_secret';

  if v_secret is null or btrim(v_secret) = '' then
    raise notice 'Secret smartroutes_cron_secret nao encontrado no Vault. Rode: select public.configurar_cron_automacao_diaria_5min(''SEU_CRON_SECRET'');';
    return;
  end if;

  perform public.configurar_cron_automacao_diaria_5min(v_secret);
end $$;
