-- =========================================================
-- Variável {saudacao} no cabeçalho do template
-- =========================================================
-- 1) Atualiza o DEFAULT da coluna cabecalho — todo motorista novo cadastrado
--    a partir de agora vai pegar o template com {saudacao}.
-- 2) Sobrescreve cabeçalhos de motoristas EXISTENTES que ainda têm o texto
--    padrão antigo (estratégia agressiva, conservadora para quem editou).
-- 3) Atualiza a função criar_dados_iniciais_motorista para coerência.
--
-- A substituição da variável em runtime acontece nas Edge Functions
-- iniciar-viagem (via _shared/viagem.ts) e reenviar-confirmacao.
-- =========================================================

-- 1) Novo default para cadastros futuros
alter table templates_mensagem
  alter column cabecalho set default '{saudacao}! Confirmação de presença na van escolar para hoje.';

-- 2) Migra cabeçalhos que ainda estão no formato padrão antigo. Quem editou
--    o cabeçalho manualmente NÃO é tocado (preserva customização).
update templates_mensagem
   set cabecalho = '{saudacao}! Confirmação de presença na van escolar para hoje.'
 where cabecalho in (
   'Bom dia! Confirmação de presença na van escolar.',
   'Bom dia! Confirmação de presença na van escolar para hoje.'
 );

-- 3) Reescreve a função que cria os dados iniciais do motorista para usar
--    o novo cabeçalho. SECURITY DEFINER mantido (mesmo da definição original).
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
    '{saudacao}! Confirmação de presença na van escolar para hoje.',
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
