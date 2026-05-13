# Cron `automacao-diaria` — instruções do SmartRoutes

## O que faz

A Edge Function `automacao-diaria` precisa ser disparada repetidamente para
verificar quais motoristas têm horário de envio automático para o momento
atual. A função usa timezone `America/Sao_Paulo` e **comparação exata** de
hora:minuto (sem tolerância), então o cron deve rodar **uma vez por minuto** —
assim cada horário cadastrado é coberto exatamente quando o relógio bate.

A função sozinha já filtra:
- motoristas com `configuracoes_automacao.envio_automatico_ativo = false` → ignora
- rotas com `status != 'ativa'` → ignora
- motoristas sem `horario_envio_automatico` → ignora
- viagens já criadas para o dia → **NÃO duplica e ainda reenvia apenas para
  passageiros com confirmação pendente** (multi-pass; ver "Cenários" abaixo)

## Cenários cobertos pela função

A `automacao-diaria` opera em três cenários conforme o estado da rota no dia:

| Estado da rota hoje | O que a função faz | Log |
|---|---|---|
| Sem viagem hoje | Cria viagem + envia mensagem para **todos** os passageiros ativos | `cenario=rota_iniciada` |
| Viagem existe, pendentes > 0 | Reenvia mensagem **só** para confirmações `pendente` | `cenario=reenvio_pendentes` |
| Viagem existe, todos respondidos | Não faz nada | `cenario=sem_pendentes` |
| Horário não bate com o configurado | Não roda o loop da rota | `cenario=fora_da_janela` |

Não existe mais `horario_limite_resposta` como regra operacional. As
confirmações valem apenas para a viagem do dia; no dia seguinte, uma nova
viagem cria novamente todas as confirmações como `pendente`. O cron continua
reutilizando a viagem atual do dia para reenvios, mas não converte
automaticamente pendentes em `ausente`.

## Parâmetros opcionais no body

O cron padrão chama sem body (processa todos os motoristas filtrando por
horário). Para testes manuais ou disparos restritos:

```json
{
  "ignorar_horario": true,
  "motorista_id": "uuid-do-motorista"
}
```

- **`motorista_id`** — restringe o disparo a um único motorista. Útil quando
  o app dispara em nome do usuário logado (multi-tenant).
- **`ignorar_horario: true`** — pula a checagem de hora exata. **Exige
  `motorista_id`** — sem ele, retorna 400 `MOTORISTA_ID_OBRIGATORIO`. É uma
  salvaguarda contra disparo em massa acidental durante testes.

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

`status = 'succeeded'` significa que o `pg_net.http_post` foi disparado. Para
ver o que a Edge Function fez, abra **Edge Functions → automacao-diaria →
Logs**. As linhas com prefixo `[automacao-diaria]` mostram qual cenário foi
executado em cada chamada (rota_iniciada, reenvio_pendentes, sem_pendentes,
fora_da_janela).

## Forma da resposta

A Edge Function retorna JSON com contadores por motorista:

```json
{
  "processados": 1,
  "com_erro": 0,
  "timezone": "America/Sao_Paulo",
  "horario_atual_local": "07:00",
  "data_local": "2026-05-12",
  "detalhes": [{
    "motorista_id": "f9be...",
    "rotas_iniciadas": 1,
    "pendentes_reenviados": 3,
    "rotas_sem_pendentes": 2,
    "erros": []
  }]
}
```

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


