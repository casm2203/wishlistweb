# Wishlist Cris & Melck

Web de deseos para dos personas (Cris y Melck) con **3 espacios**: `/cris`, `/` (compartido, home) y `/melck`.
Cada espacio es un **tablero de corcho con marco** (imagen `public/tablero-hd.jpg`, 1536×1024, tamaño fijo) donde cada artículo es una tarjeta pegada con pin/ganchito: **artículo** (polaroid), **cine** (ticket) o **viaje** (boarding pass).

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
    (app)/page.tsx         espacio compartido   (cris/ y melck/ igual)
    (app)/ver/[space]      vista de SOLO LECTURA de cualquier tablero (/ver → /ver/shared); PÚBLICA, no pide login
  features/board/
    SpaceBoard.tsx         (server) carga items del espacio + calcula canEdit
    BoardClient.tsx        estado de items, diálogos, realtime, botones
    BoardCanvas.tsx        tablero fijo 2400×1600 con pan/zoom (ref + transform directo al DOM); zoom mín = ver todo, máx = 1.25
    Banner.tsx             letrero con el nombre del espacio (arriba al centro; `public/avisos/*.webp`, recortes con scripts/cut-banners.py)
    BoardItem.tsx          tarjeta arrastrable (polaroid/ticket + pin o ganchito); sin texto si zoom < TEXT_ZOOM (0.6)
    ItemForm.tsx           formulario (pegar foto con Ctrl/⌘+V, arrastrar o elegir archivo)
    ItemView.tsx           detalle completo al seleccionar una polaroid
    items.ts               CRUD + subida de foto (cliente, protegido por RLS)
    placement.ts           tamaño del tablero, zona útil de corcho (PLAY), clamp y hueco libre en espiral
    image.ts               redimensiona fotos a JPEG ≤ 900px
  lib/  types.ts · spaces.ts (etiquetas, tipos, monedas) · auth.ts · supabase/{client,server,session}.ts
supabase/migrations/       0001 esquema + RLS + bucket `item-images` · 0002 columna `category` · 0003 lectura pública de `items`
design-src/                originales sin procesar (NO van al repo ni se sirven; ver .gitignore)
public/pins, public/tickets  recortes con transparencia (pines, ganchito, ticket cine, boarding pass)
scripts/make-favicon.py    genera icon.svg, favicon.ico y apple-icon.png (✨ dorado)
scripts/cut-assets.py      genera esos recortes desde los originales en public/ (requiere Pillow)
```

## Despliegue
- Repo público: https://github.com/casm2203/wishlistweb (rama `main`). Commits con el correo noreply de GitHub; `.env*` y `design-src/` están en `.gitignore`.
- Producción en Vercel: https://wishlistweb.vercel.app (proyecto `wishlistweb`, equipo `casm2203s-projects`, conectado al repo: cada push a `main` despliega). `vercel.json` fija `framework: nextjs` (sin eso Vercel lo servía como estático y daba 404).
- Variables en Vercel (Production/Preview/Development): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (públicas por diseño). Nunca subir claves `service_role`.
- Se usó la CLI de Vercel (`vercel deploy --prod --scope casm2203s-projects`); el MCP de Vercel no tiene permiso de escritura en esa cuenta.

## Reglas de negocio
- Ambos **ven** los 3 espacios; **editan** solo el propio y el compartido (RLS en `items`; `canEdit` en UI es solo comodidad).
- Item: `category` (articulo | cine | viaje, define el fondo y tamaño en `CATEGORIES` de `lib/spaces.ts`), nombre, descripción, precio+moneda, enlace, foto, `needs_locker` (casillero), `kind` (want/buy/gift), `status` (pending/reserved/bought), posición x/y/rotación en coordenadas del mundo.
- Navegación del tablero: arrastrar fondo = mover; Ctrl/⌘+rueda, pellizco, `+`/`-` o botones = zoom; "Ver todo" encuadra. El tablero nunca se sale de la vista y las tarjetas no pueden salir del corcho.
- Pin: el color es "aleatorio" pero estable (`pinFor(id)` en `lib/spaces.ts`, hash del id sobre los 9 colores); ya no indica la intención, eso se ve en el detalle. Los viajes usan el ganchito. El casillero solo aplica a artículos.
- Calidad: no usar `next/image` para el tablero/recortes (reencodaría); el zoom máximo se limita para no ampliar más de ~2× el corcho (1536 px de origen). `tablero.jpeg`/`tablero2.png` en public/ son los originales (no se usan).
- Click sin arrastrar en una polaroid abre el detalle; arrastrar la mueve y guarda al soltar.
- Letrero: Cris y compartido usan `aviso-cris`, Melck `aviso-melck` (config en `SPACES`). La zona del letrero está reservada al colocar tarjetas nuevas (`BANNER` en placement.ts); las tarjetas pueden arrastrarse encima y lo tapan.
- `/ver/[space]`: mismo tablero con `canEdit=false` para todos (ni siquiera el dueño edita); el nav cambia a esas rutas y muestra "Solo lectura · Editar". Es pública para que alguien externo pueda mirar: `proxy` deja pasar `/ver` (`PUBLIC_PREFIXES`) y la migración 0003 da `select` a `anon` en `items`. Escribir sigue exigiendo sesión con perfil (RLS). Ojo: cualquiera con el enlace ve los 3 tableros completos, incluidos los regalos.
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
- [ ] Permitir a la otra persona **reservar/marcar comprado** un item en el espacio ajeno (hoy RLS solo deja editar el propio; requiere policy/RPC que limite a la columna `status`).
- [ ] Borrar de Storage la foto al eliminar/reemplazar un item.
- [ ] Zoom con rueda simple para usuarios de mouse (hoy rueda = mover; zoom = Ctrl/⌘+rueda).
- [ ] Minimapa y selección múltiple en el tablero.
- [ ] Autocompletar nombre/foto/precio desde el enlace (Open Graph) en el formulario.
- [ ] Ordenar/filtrar por tipo, estado y casillero.
- [ ] Deploy en Vercel.
