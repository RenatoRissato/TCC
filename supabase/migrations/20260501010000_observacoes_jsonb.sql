-- Converte observacoes de TEXT para JSONB.
-- Antes: armazenava o nome do responsável como string livre.
-- Agora: estrutura tipada com tipo de passageiro, instituição, série/semestre, curso e (opcional) nome do responsável.
--
-- Preserva os dados existentes:
--   - NULL/'' permanecem NULL
--   - Strings que já parecem JSON (raro, mas defensivo) são convertidas direto
--   - Demais strings (caso comum: nome do responsável) viram { "nomeResponsavel": "<string>" }
ALTER TABLE passageiros
  ALTER COLUMN observacoes TYPE jsonb
  USING CASE
    WHEN observacoes IS NULL OR observacoes = '' THEN NULL
    WHEN observacoes ~ '^[\[{]' THEN observacoes::jsonb
    ELSE jsonb_build_object('nomeResponsavel', observacoes)
  END;
