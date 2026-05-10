# Cron `automacao-diaria` — instruções

## O que faz

A Edge Function `automacao-diaria` precisa ser disparada repetidamente para
verificar quais motoristas têm horário de envio automático configurado para o
momento atual. A função tem timezone `America/Sao_Paulo` e janela de tolerância
de ±5 minutos, então rodar **uma vez por minuto** é o que garante que cada
horário cadastrado caia dentro de pelo menos uma execução.

A função sozinha já filtra:
- motoristas com `configuracoes_automacao.envio_automatico_ativo = false` → ignora
- rotas com `status != 'ativa'` → ignora
- viagens já criadas para o dia → não duplica
- motoristas sem `horario_envio_automatico` → ignora

## Como ativar (2 minutos)

1. Pegue o **Reference ID** do projeto Supabase em **Settings → General**.
2. Confirme que o secret `CRON_SECRET` já está configurado em
   **Edge Functions → Manage secrets** (mesmo valor que a função valida no
   header `x-cron-secret`).
3. Abra **SQL Editor** no Dashboard.
4. Abra o arquivo [`supabase/sql/cron_automacao.sql`](../supabase/sql/cron_automacao.sql)
   e copie o conteúdo.
5. Substitua os dois placeholders no SQL:
   - `__PROJECT_REF__` → o Reference ID do projeto
   - `__CRON_SECRET__` → o valor do secret
6. Cole no SQL Editor e clique em **Run**.

## Verificação

Depois de rodar, confirme o job:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'automacao-diaria-1min';
```

Aguarde ~1 minuto e veja as primeiras execuções:

```sql
select runid, start_time, end_time, status, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'automacao-diaria-1min')
order by start_time desc
limit 10;
```

`status = 'succeeded'` significa que o `pg_net.http_post` foi disparado. Para ver
o que a Edge Function fez, abra **Edge Functions → automacao-diaria → Logs**.

## Rollback

Se precisar pausar:

```sql
select cron.unschedule(
  (select jobid from cron.job where jobname = 'automacao-diaria-1min')
);
```

## Por que não está em `migrations/`?

`supabase db push` aplica `migrations/` automaticamente, mas:

- `pg_cron`/`pg_net` exigem extensões habilitadas pelo dono do banco
- O job referencia o `PROJECT_REF` e o `CRON_SECRET` — valores específicos do
  ambiente, não do schema

Por isso o SQL fica em `supabase/sql/` como um arquivo "cole-no-Dashboard",
controlado pelo time, mas executado uma vez por ambiente.
