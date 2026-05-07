-- Converte observacoes de TEXT para JSONB.
-- Antes: armazenava o nome do responsável como string livre.
-- Agora: estrutura tipada com tipo de passageiro, instituição, série/semestre, curso e (opcional) nome do responsável.
--
-- Preserva os dados existentes:
--   - NULL/'' permanecem NULL
--   - Strings que já parecem JSON (raro, mas defensivo) são convertidas direto
--   - Demais strings (caso comum: nome do responsável) viram { "nomeResponsavel": "<string>" }
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'passageiros'
      AND column_name = 'observacoes'
      AND udt_name <> 'jsonb'
  ) THEN
    ALTER TABLE passageiros
      ALTER COLUMN observacoes TYPE jsonb
      USING CASE
        WHEN observacoes IS NULL OR btrim(observacoes) = '' THEN NULL
        WHEN ltrim(observacoes) ~ '^[\[{]' THEN observacoes::jsonb
        ELSE jsonb_build_object('nomeResponsavel', observacoes)
      END;
  END IF;
END $$;
