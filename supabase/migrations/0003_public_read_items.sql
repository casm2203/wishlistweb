-- /ver es pública: cualquiera puede LEER los tableros; escribir sigue exigiendo sesión con perfil.
create policy "leer items publico" on public.items
  for select to anon using (true);
