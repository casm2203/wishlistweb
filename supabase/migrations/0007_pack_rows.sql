-- Reacomoda las tarjetas de cada espacio en filas de izquierda a derecha (mezclando categorías)
-- para que el tablero se vea ancho y con todas las tarjetas a la vista, no en una columna.
do $$
declare
  r record;
  sp text;
  cx int; cy int; rh int; w int; h int;
begin
  for sp in select distinct space from public.items loop
    cx := 60; cy := 60; rh := 0;
    for r in
      select id, category, style, scale from public.items where space = sp
      order by array_position(array['articulo','cine','viaje','nota'], category), created_at
    loop
      -- tamaño por estilo (o el de la categoría si no tiene estilo propio)
      select ww, hh into w, h from (values
        ('polaroid',170,226),('estampilla',176,228),('boleta',176,352),('pelicula',156,388),
        ('correo',184,360),('postit',178,178),('cuaderno',184,220),('clasica',172,150),('ficha',200,132)
      ) as t(s, ww, hh)
      where s = coalesce(r.style, case r.category when 'articulo' then 'polaroid' when 'cine' then 'boleta'
                                   when 'viaje' then 'correo' else 'postit' end);
      if cx + w > 1200 - 60 and cx > 60 then
        cx := 60; cy := cy + rh + 50; rh := 0;
      end if;
      update public.items set x = cx, y = cy where id = r.id;
      cx := cx + w + 50;
      rh := greatest(rh, h);
    end loop;
  end loop;
end $$;
