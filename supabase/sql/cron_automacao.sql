-- =========================================================
-- Cron job: dispara automacao-diaria a cada minuto
-- =========================================================
-- ESTE ARQUIVO NÃO É UMA MIGRATION (`supabase db push` ignora a pasta sql/).
-- Cole no Supabase Dashboard → SQL Editor e execute.
--
-- A função automacao-diaria já tem:
--   - timezone America/Sao_Paulo
--   - janela de tolerância de ±5min em torno de horario_envio_automatico
--   - lê só motoristas com envio_automatico_ativo = true
--   - ignora rotas com status != 'ativa'
--   - pula viagens já existentes para o dia
-- Por isso é seguro rodar a cada minuto: ela mesma decide quando agir.
-- =========================================================

-- 1) Habilitar extensões (uma única vez por projeto)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Antes de criar/recriar o job, remova qualquer agendamento anterior
--    (idempotente — não falha se o job não existir).
do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'automacao-diaria-1min';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
end $$;

-- 3) Agenda o job — substitua os dois placeholders abaixo:
--    __PROJECT_REF__   → ref do seu projeto Supabase (ex: fbrepsmavjeokfucppio)
--    __CRON_SECRET__   → valor do secret CRON_SECRET configurado na Edge Function
--
--    Você encontra o ref do projeto em:
--      Settings → General → Reference ID
--    Ou no URL do dashboard: https://supabase.com/dashboard/project/{REF}
select cron.schedule(
  'automacao-diaria-1min',
  '* * * * *',  -- todo minuto, 24/7 — a função decide se age
  $$
  select net.http_post(
    url     := 'https://__PROJECT_REF__.supabase.co/functions/v1/automacao-diaria',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-cron-secret',   '__CRON_SECRET__'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

-- 4) Verificação — depois de criar, confirme que o job está agendado:
--    select jobid, jobname, schedule, active from cron.job
--      where jobname = 'automacao-diaria-1min';
--
--    E veja as últimas execuções (após o primeiro disparo):
--    select runid, jobid, start_time, end_time, status, return_message
--      from cron.job_run_details
--      where jobid = (select jobid from cron.job where jobname = 'automacao-diaria-1min')
--      order by start_time desc
--      limit 10;

-- =========================================================
-- Para REMOVER o cron (rollback):
--   select cron.unschedule(
--     (select jobid from cron.job where jobname = 'automacao-diaria-1min')
--   );
-- =========================================================
