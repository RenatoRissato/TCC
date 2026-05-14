alter table public.motoristas
  add column if not exists foto_url text;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "motorista_ler_fotos_perfil" on storage.objects;
create policy "motorista_ler_fotos_perfil"
  on storage.objects
  for select
  using (bucket_id = 'profile-photos');

drop policy if exists "motorista_inserir_propria_foto" on storage.objects;
create policy "motorista_inserir_propria_foto"
  on storage.objects
  for insert
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] in (
      select m.id::text from public.motoristas m where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_atualizar_propria_foto" on storage.objects;
create policy "motorista_atualizar_propria_foto"
  on storage.objects
  for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] in (
      select m.id::text from public.motoristas m where m.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] in (
      select m.id::text from public.motoristas m where m.user_id = auth.uid()
    )
  );

drop policy if exists "motorista_remover_propria_foto" on storage.objects;
create policy "motorista_remover_propria_foto"
  on storage.objects
  for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] in (
      select m.id::text from public.motoristas m where m.user_id = auth.uid()
    )
  );
