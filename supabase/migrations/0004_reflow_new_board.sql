-- Nuevo corcho en CSS: ancho lógico de 1200 (antes 2400 sobre una imagen). Recoloca las tarjetas
-- existentes en filas por categoría (artículo, cine, viaje) dentro de cada espacio.
with groups as (
  select
    space, category, count(*) as cnt,
    case category when 'articulo' then 6 when 'cine' then 6 else 5 end as cols,
    case category when 'articulo' then 250 when 'cine' then 380 else 390 end as row_h,
    case category when 'articulo' then 190 when 'cine' then 195 else 230 end as col_w,
    case category when 'articulo' then 1 when 'cine' then 2 else 3 end as ord
  from public.items
  group by space, category
), offs as (
  select *,
    20 + coalesce(sum(ceil(cnt::numeric / cols) * row_h)
      over (partition by space order by ord rows between unbounded preceding and 1 preceding), 0) as y0
  from groups
), ranked as (
  select id, space, category,
    row_number() over (partition by space, category order by created_at) - 1 as n
  from public.items
)
update public.items i
set x = 20 + (r.n % o.cols) * o.col_w,
    y = o.y0 + (r.n / o.cols) * o.row_h,
    rotation = least(5, greatest(-5, i.rotation))
from ranked r
join offs o on o.space = r.space and o.category = r.category
where i.id = r.id;
