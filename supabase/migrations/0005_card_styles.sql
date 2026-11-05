-- Tarjetas personalizables: estilo, papel, tinta, sujetador, tamaño y orden de apilado,
-- foto de respaldo (emoji + color) y código del pase de viaje. Todo opcional: null = valor por defecto.
alter table public.items drop constraint if exists items_category_check;
alter table public.items
  add constraint items_category_check check (category in ('articulo', 'cine', 'viaje', 'nota'));

alter table public.items
  add column style text check (style in
    ('polaroid', 'estampilla', 'boleta', 'pelicula', 'correo', 'postit', 'cuaderno', 'clasica', 'ficha')),
  add column paper text check (paper ~ '^#[0-9a-fA-F]{6}$'),
  add column ink text check (ink ~ '^#[0-9a-fA-F]{6}$'),
  add column holder text check (holder in ('pin', 'tape', 'clip', 'none')),
  add column holder_color text check (holder_color ~ '^#[0-9a-fA-F]{6}$'),
  add column bg text check (bg ~ '^#[0-9a-fA-F]{6}$'),
  add column emoji text check (char_length(emoji) <= 16),
  add column code text check (char_length(code) <= 4),
  add column scale real not null default 1 check (scale between 0.5 and 2.2),
  add column z integer not null default 1;
