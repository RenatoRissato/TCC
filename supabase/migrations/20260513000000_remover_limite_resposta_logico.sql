-- O sistema deixa de usar horario_limite_resposta como regra operacional.
-- As confirmações valem apenas para o dia da viagem; no dia seguinte, uma
-- nova viagem gera novas confirmações em status 'pendente'.

update public.configuracoes_automacao
set horario_limite_resposta = null
where horario_limite_resposta is not null;
