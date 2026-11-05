# Wishlist Cris & Melck

Web de deseos para dos personas (Cris y Melck) con **3 espacios** (cris, compartido, melck). Portada pública de solo lectura en `/`; edición con login en `/editar/*`.
Cada espacio es un **tablero de corcho con marco hecho en CSS** (fondo de la página blanco, scroll normal) donde cada artículo es una tarjeta pegada con pin, cinta o clip. Categorías y estilos: **artículo** (polaroid, estampita), **cine** (boleta, tira de película), **viaje** (correo aéreo), **nota** (post-it, cuaderno, notita clásica, ficha). Diseño de referencia: el prototipo HTML que Cris compartió como artefacto de Claude (ya implementado por fases A–B; fases C —bandeja de creación y hoja de cuaderno— y D —reserva con sesión— hechas).

> Next.js 16 con cambios incompatibles (ver `AGENTS.md`): antes de tocar APIs de Next lee `node_modules/next/dist/docs/`.
> Aquí: `middleware` → **`src/proxy.ts`**, Cache Components activado (todo acceso a `cookies()`/datos va dentro de `<Suspense>`), `LayoutProps<"/">` global.

## Stack
Next 16 (App Router, TS, Tailwind v4) · Supabase (Postgres + Auth + Storage + Realtime) · sin librerías de canvas (pan/zoom hecho a medida, limitado al tablero).

## Comandos
- `npm run dev` / `npm run build` / `npm run lint` / `npx tsc --noEmit`
- Variables en `.env.local` (plantilla: `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Base de datos: ejecutar `supabase/migrations/0001_init.sql`; luego crear 2 usuarios (email+contraseña) en Auth e insertarlos en `profiles` (instrucciones al final del SQL).

## Arquitectura
```
src/
  proxy.ts                 refresca sesión Supabase y manda a /login si no hay sesión
  app/
    layout.tsx             fuentes (Geist + Caveat para el texto "a mano")
    login/                 página + server actions signIn/signOut
    (app)/layout.tsx       header (SpaceNav + salir); exige perfil cris|melck
    (app)/page.tsx         PORTADA pública: tablero compartido en solo lectura
    (app)/ver/[space]      solo lectura pública de cris|melck (shared → /); /ver → /
    (app)/editar/[space]   tableros EDITABLES (exigen login; editas el tuyo y el compartido); /editar → /editar/shared
  features/board/
    SpaceBoard.tsx         (server) carga items del espacio + calcula canEdit
    BoardClient.tsx        estado de items, diálogos, realtime, FAB "+ pegar algo" (dentro del tablero, abajo a la derecha), gestos → guarda con layoutItem
    BoardStage.tsx         corcho de ancho lógico 1200; en escritorio el tablero tiene alto fijo (ancho/1.75) y se escala (k ≤ 2.5) para que todas las tarjetas quepan sin scroll; en móvil k ≥ 0.6 y se desliza; `ScaleContext`
    Sign.tsx               letrero de madera con nombre y subtítulo del espacio
    cards.tsx              `Card`: todos los estilos de tarjeta en CSS + sujetador (pin/cinta/clip) + sellos + insignia de casillero
    BoardItem.tsx          posición de la tarjeta: arrastrar, pellizco (tamaño+giro), Ctrl+rueda (tamaño), Shift+rueda (giro); clic = detalle
    ItemForm.tsx           formulario con vista previa viva, estilo/papel/tinta/sujetador/emoji/código/inclinación (pegar foto con Ctrl/⌘+V)
    ItemView.tsx           detalle completo
    items.ts               CRUD + `layoutItem` (x,y,scale,rotation,z) + subida de foto (cliente, protegido por RLS)
    actions.ts             server actions para los UPDATE (mover, editar, estado): el navegador no puede hacer PATCH a Supabase (CORS), así que van por el servidor
    placement.ts           ancho lógico, `box()` (tamaño visual con escala), clamp y primer hueco libre (izq→der, arriba→abajo)
    image.ts               redimensiona fotos a JPEG ≤ 900px
  app/board.css            marco, corcho, encaje, pestañas, letrero, tarjetas, sellos, FAB (clases globales del diseño)
  components/              SpaceNav (pestañas de papel) · BoardMenu (hamburguesa de papel arriba a la derecha: ver como visitante / editar / acomodar tarjetas / salir)
  lib/  types.ts · spaces.ts (etiquetas, tipos, monedas) · auth.ts · supabase/{client,server,session}.ts
supabase/migrations/       0001 esquema + RLS + bucket `item-images` · 0002 `category` · 0003 lectura pública de `items` · 0004 reubica tarjetas al corcho de 1200 · 0005 estilo/papel/tinta/sujetador/escala/z/emoji/bg/code + categoría `nota` · 0006 RPC `reserve_item` (reservar/liberar en el tablero ajeno, solo con sesión y perfil; no guarda quién) · 0007 reacomoda las tarjetas en filas (opcional; la app también lo hace con «Acomodar tarjetas»)
design-src/                originales sin procesar (NO van al repo ni se sirven; ver .gitignore)
scripts/make-favicon.py    genera icon.svg, favicon.ico y apple-icon.png (✨ dorado)
```

## Despliegue
- Repo público: https://github.com/casm2203/wishlistweb (rama `main`). Commits con el correo noreply de GitHub; `.env*` y `design-src/` están en `.gitignore`.
- Dominio propio: https://wishlist.cristiansuarez.me (CNAME `wishlist` → `9d8dfe04f2c3d43d.vercel-dns-017.com` en Porkbun, que aloja el DNS de cristiansuarez.me; dominio añadido al proyecto de Vercel).
- Producción en Vercel: https://wishlistweb.vercel.app (proyecto `wishlistweb`, equipo `casm2203s-projects`, conectado al repo: cada push a `main` despliega). `vercel.json` fija `framework: nextjs` (sin eso Vercel lo servía como estático y daba 404).
- Variables en Vercel (Production/Preview/Development): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (públicas por diseño). Nunca subir claves `service_role`.
- Se usó la CLI de Vercel (`vercel deploy --prod --scope casm2203s-projects`); el MCP de Vercel no tiene permiso de escritura en esa cuenta.

## Reglas de negocio
- Ambos **ven** los 3 espacios; **editan** solo el propio y el compartido (RLS en `items`; `canEdit` en UI es solo comodidad).
- Item: `category` (articulo | cine | viaje, define el fondo y tamaño en `CATEGORIES` de `lib/spaces.ts`), nombre, descripción, precio+moneda, enlace, foto, `needs_locker` (casillero), `kind` (want/buy/gift), `status` (pending/reserved/bought), posición x/y/rotación en coordenadas del mundo.
- Navegación del tablero: arrastrar fondo = mover; Ctrl/⌘+rueda, pellizco, `+`/`-` o botones = zoom; "Ver todo" encuadra. El tablero nunca se sale de la vista y las tarjetas no pueden salir del corcho.
- Pin: el color es "aleatorio" pero estable (`pinFor(id)` en `lib/spaces.ts`, hash del id sobre los 9 colores); ya no indica la intención, eso se ve en el detalle. Los viajes usan el ganchito. El casillero solo aplica a artículos.
- Calidad: el tablero es solo CSS/SVG (sin imágenes de fondo); las fotos de artículos no pasan por `next/image` (reencodaría).
- Click sin arrastrar en una polaroid abre el detalle; arrastrar la mueve y guarda al soltar.
- Letrero: Cris y compartido usan `aviso-cris`, Melck `aviso-melck` (config en `SPACES`). La zona del letrero está reservada al colocar tarjetas nuevas (`BANNER` en placement.ts); las tarjetas pueden arrastrarse encima y lo tapan.
- Rutas: `/` y `/ver/*` son de solo lectura (`readOnly` → `canEdit=false` para todos); `/editar/*` exige sesión. `SpaceNav` cambia sus enlaces según la ruta y `ModeLink` (abajo a la izquierda) ofrece "Iniciar sesión para editar" / "Editar mi tablero" / "Ver como visitante". Tras el login se va a `/editar/<su tablero>`; `/cris` y `/melck` redirigen a `/ver/*`. La lectura es pública para que alguien externo pueda mirar: `proxy` deja pasar `/ver` (`PUBLIC_PREFIXES`) y la migración 0003 da `select` a `anon` en `items`. Escribir sigue exigiendo sesión con perfil (RLS). Ojo: cualquiera con el enlace ve los 3 tableros completos, incluidos los regalos.
- Autocompletar: en el formulario, pegar un enlace llama a `/api/link-preview` (Open Graph + JSON-LD) y `/api/link-image`; ambos exigen sesión y bloquean IPs privadas (SSRF, `lib/safeFetch.ts`). Solo rellena campos vacíos; si el sitio bloquea (p. ej. sin precio en Open Graph) se completa a mano.
- Móvil: nav compacta (nombres cortos), zoom inicial 0.36 sobre el letrero en pantallas <640 px, formulario sin rotación. Los gestos táctiles reales (pellizco) no se probaron: el navegador de pruebas emula con ratón.
- Los enlaces solo se renderizan si son `http(s)`.

## Convenciones
- Textos de UI en español. Componentes de cliente solo donde hay interacción; datos iniciales vienen de Server Components.
- No leer refs durante render (regla `react-hooks/refs` activa).

## Pendientes
- [x] Proyecto Supabase `wishlist-cris-melck` (us-east-1) creado, migraciones 0001-0003 aplicadas, `.env.local` listo (el ref/URL del proyecto vive solo en `.env.local` y en Vercel).
- [x] Usuario Cris creado y asignado en `profiles`. Melck también creado y asignado.
- [x] Probado en navegador como Cris: agregar con foto, arrastrar, pan/zoom, texto oculto al alejar, detalle, persistencia al recargar, espacio de Melck en solo lectura.
- [x] Realtime verificado como Melck (INSERT/UPDATE/DELETE llegan en vivo). Requiere `realtime.setAuth(jwt)` antes de suscribirse y suscripción sin filtro por espacio (Realtime no entrega DELETE filtrados por columnas no-PK).
- [x] Tablero fijo con marco, pines/ganchito recortados y categorías artículo/cine/viaje (probado como Melck en el espacio compartido).
- [ ] Revisar con el usuario: pines sin usar (negro, rosa, cian, amarillo, menta, morado), zona de texto de los tickets y capacidad (~35-40 artículos por tablero).
- [ ] Si algún día /ver debe ser privada otra vez: quitar `/ver` de `PUBLIC_PREFIXES` y borrar la policy "leer items publico" (migración 0003).
- [ ] Probar el pegado real con Ctrl/⌘+V (se probó subiendo archivo), editar/eliminar desde la UI y cambiar estados.
- [x] Reservar en el espacio ajeno vía RPC `reserve_item` (solo pending↔reserved; visitantes sin sesión ven "Inicia sesión para reservarlo"). Falta probarlo con sesión real; "comprado" lo marca solo el dueño.
- [ ] Borrar de Storage la foto al eliminar/reemplazar un item.
- [ ] Zoom con rueda simple para usuarios de mouse (hoy rueda = mover; zoom = Ctrl/⌘+rueda).
- [ ] Minimapa y selección múltiple en el tablero.
- [ ] Autocompletar nombre/foto/precio desde el enlace (Open Graph) en el formulario.
- [ ] Ordenar/filtrar por tipo, estado y casillero.
- [ ] Deploy en Vercel.
