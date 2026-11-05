-- Nuevo estilo de tarjeta «recibo» (artículos). La prioridad (Lo quiero / Por comprar / Para regalar)
-- ya existe como items.kind (want | buy | gift).
alter table public.items drop constraint if exists items_style_check;
alter table public.items
  add constraint items_style_check check (style in
    ('polaroid', 'estampilla', 'recibo', 'boleta', 'pelicula', 'correo', 'postit', 'cuaderno', 'clasica', 'ficha'));
