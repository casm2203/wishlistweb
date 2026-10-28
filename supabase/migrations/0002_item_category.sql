-- Tipo de tarjeta: artículo (polaroid), cine (ticket) o viaje (boarding pass).
alter table public.items
  add column category text not null default 'articulo'
  check (category in ('articulo', 'cine', 'viaje'));
