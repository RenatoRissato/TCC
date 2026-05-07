-- Endereço de embarque estruturado em 4 colunas (igual ao ponto de saída das rotas).
-- endereco_embarque é mantido e populado pelo app com a concatenação dos 4 campos.
ALTER TABLE passageiros
  ADD COLUMN IF NOT EXISTS embarque_rua    TEXT,
  ADD COLUMN IF NOT EXISTS embarque_numero TEXT,
  ADD COLUMN IF NOT EXISTS embarque_bairro TEXT,
  ADD COLUMN IF NOT EXISTS embarque_cep    TEXT;
