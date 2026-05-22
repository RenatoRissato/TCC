-- Torna fotos de perfil privadas. O app passa a gerar URLs assinadas no
-- frontend autenticado, mantendo cada motorista restrito a sua propria pasta.

update storage.buckets
   set public = false
 where id = 'profile-photos';

drop policy if exists "motorista_ler_fotos_perfil" on storage.objects;
drop policy if exists "motorista_ler_propria_foto" on storage.objects;

create policy "motorista_ler_propria_foto"
  on storage.objects
  for select
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] in (
      select m.id::text from public.motoristas m where m.user_id = auth.uid()
    )
  );
