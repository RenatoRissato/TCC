-- Limpa inconsistencias operacionais encontradas em producao:
-- 1. Remove cron legado duplicado que chamava automacao-diaria alem do job atual.
-- 2. Remove configuracoes de automacao ligadas a rotas inativas.
-- 3. Aplica hardening seguro em funcoes internas expostas como RPC.

do $$
begin
  if to_regnamespace('cron') is not null
     and exists (select 1 from cron.job where jobname = 'automacao-diaria-smartroute') then
    perform cron.unschedule('automacao-diaria-smartroute');
  end if;
end $$;

delete from public.configuracoes_automacao_rotas car
using public.rotas r
where r.id = car.rota_id
  and r.status <> 'ativa';

-- Trigger/helper functions should not be callable directly via REST/RPC.
revoke execute on function public.configurar_cron_automacao_diaria_5min(text, text) from anon, authenticated;
revoke execute on function public.rotas_sync_nome_motorista() from anon, authenticated;
revoke execute on function public.motoristas_propagar_nome_para_rotas() from anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
  end if;
end $$;

-- Remove public/anon access but keep authenticated access, because the
-- criar-perfil-motorista Edge Function invokes this RPC with the user's JWT.
revoke execute on function public.criar_dados_iniciais_motorista(uuid) from public, anon;
grant execute on function public.criar_dados_iniciais_motorista(uuid) to authenticated;

alter function public.atualizar_timestamp() set search_path = public;
alter function public.popular_historico_ao_finalizar() set search_path = public;
alter function public.criar_dados_iniciais_motorista(uuid) set search_path = public;
