alter table public.motoristas
  add column if not exists cnh text,
  add column if not exists placa_van text,
  add column if not exists marca_van text,
  add column if not exists modelo_van text,
  add column if not exists ano_van integer;
