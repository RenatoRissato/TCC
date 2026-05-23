-- Completa o hardening de RPC: revogar de PUBLIC e manter expostas apenas
-- funcoes que o app realmente chama com JWT autenticado.

revoke execute on function public.configurar_cron_automacao_diaria_5min(text, text) from public;
revoke execute on function public.rotas_sync_nome_motorista() from public;
revoke execute on function public.motoristas_propagar_nome_para_rotas() from public;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public;
  end if;
end $$;

-- Necessaria para a Edge Function criar-perfil-motorista.
grant execute on function public.criar_dados_iniciais_motorista(uuid) to authenticated;
