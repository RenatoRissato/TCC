-- Remove a coluna legada endereco_embarque.
-- Os dados de endereço agora vivem exclusivamente nas colunas estruturadas:
-- embarque_rua, embarque_numero, embarque_bairro, embarque_cep.
-- Manter as duas colunas causava inconsistência: o app exibia os campos
-- estruturados, mas o Google Maps recebia o valor legado (que podia estar desatualizado).

ALTER TABLE passageiros DROP COLUMN IF EXISTS endereco_embarque;
