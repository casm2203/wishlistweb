-- Wishlist: perfiles, artículos del tablero y fotos.
-- Ejecutar en el SQL editor de Supabase (o con `supabase db push`).

-- Quién es cada usuario autenticado ('cris' o 'melck').
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  owner text not null unique check (owner in ('cris', 'melck'))
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  space text not null check (space in ('cris', 'melck', 'shared')),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  price numeric(12, 2),
  currency text not null default 'USD',
  url text,
  image_url text,
  needs_locker boolean not null default false,
  kind text not null default 'want' check (kind in ('want', 'buy', 'gift')),
  status text not null default 'pending' check (status in ('pending', 'reserved', 'bought')),
  -- posición en el tablero (coordenadas del mundo, no de la pantalla)
  x double precision not null default 0,
  y double precision not null default 0,
  rotation real not null default 0,
  created_by uuid references auth.users default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_space_idx on public.items (space);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_touch_updated_at
before update on public.items
for each row execute function public.touch_updated_at();

-- Devuelve 'cris' | 'melck' para el usuario actual (null si no tiene perfil).
create function public.current_owner() returns text
language sql stable security definer set search_path = public as $$
  select owner from public.profiles where user_id = auth.uid()
$$;
revoke execute on function public.current_owner() from public, anon;
grant execute on function public.current_owner() to authenticated;

alter table public.profiles enable row level security;
alter table public.items enable row level security;

create policy "perfil propio" on public.profiles
  for select to authenticated using (user_id = auth.uid());

-- Ambos pueden VER todos los espacios; solo EDITAN el propio y el compartido.
create policy "ver items" on public.items
  for select to authenticated using (public.current_owner() is not null);

create policy "crear items" on public.items
  for insert to authenticated
  with check (space = 'shared' or space = public.current_owner());

create policy "editar items" on public.items
  for update to authenticated
  using (space = 'shared' or space = public.current_owner())
  with check (space = 'shared' or space = public.current_owner());

create policy "borrar items" on public.items
  for delete to authenticated
  using (space = 'shared' or space = public.current_owner());

-- Fotos (bucket público de lectura; escritura solo usuarios con perfil).
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "subir fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-images' and public.current_owner() is not null);

create policy "borrar fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-images' and public.current_owner() is not null);

-- Cambios en vivo entre Cris y Melck.
alter publication supabase_realtime add table public.items;

-- Después de crear los 2 usuarios en Authentication > Users, asignarlos:
-- insert into public.profiles (user_id, owner) values
--   ('<uuid de Cris>', 'cris'),
--   ('<uuid de Melck>', 'melck');
