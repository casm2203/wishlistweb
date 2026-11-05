-- Reservar un regalo en el tablero de la otra persona.
-- RLS solo deja editar el propio tablero y el compartido; esta función permite
-- únicamente alternar status pending <-> reserved, y solo a usuarios con perfil
-- sobre items del espacio ajeno. No guarda quién reservó.
create or replace function public.reserve_item(item_id uuid, reserve boolean)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := public.current_owner();
  it public.items;
begin
  if me is null then
    raise exception 'Inicia sesión para reservar';
  end if;

  select * into it from public.items where id = item_id;
  if not found then
    raise exception 'Ese artículo ya no existe';
  end if;
  if it.space = 'shared' or it.space = me then
    raise exception 'Solo puedes reservar en el tablero de la otra persona';
  end if;

  if reserve and it.status = 'pending' then
    update public.items set status = 'reserved' where id = item_id returning * into it;
  elsif not reserve and it.status = 'reserved' then
    update public.items set status = 'pending' where id = item_id returning * into it;
  else
    raise exception 'El estado ya cambió; recarga el tablero';
  end if;

  return it;
end;
$$;

revoke execute on function public.reserve_item(uuid, boolean) from public, anon;
grant execute on function public.reserve_item(uuid, boolean) to authenticated;
