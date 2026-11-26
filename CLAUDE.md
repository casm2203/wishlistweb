# Wishlist Cris & Melck

Web de deseos para dos personas (Cris y Melck) con **3 espacios** (cris, compartido, melck). Portada pública de solo lectura en `/`; edición con login en `/editar/*`.
Cada espacio es un **tablero de corcho con marco hecho en CSS** (fondo de la página blanco, scroll normal) donde cada artículo es una tarjeta pegada con pin, cinta o clip. Categorías y estilos: **artículo** (polaroid, estampita), **cine** (boleta, tira de película), **viaje** (correo aéreo), **nota** (post-it, cuaderno, notita clásica, ficha). Diseño de referencia: el prototipo HTML que Cris compartió como artefacto de Claude (ya implementado por fases A–B; fases C —bandeja de creación y hoja de cuaderno— y D —reserva con sesión— hechas).

> Next.js 16 con cambios incompatibles (ver `AGENTS.md`): antes de tocar APIs de Next lee `node_modules/next/dist/docs/`.
> Aquí: `middleware` → **`src/proxy.ts`**, Cache Components activado (todo acceso a `cookies()`/datos va dentro de `<Suspense>`), `LayoutProps<"/">` global.

> **Base de datos (desde nov 2026):** Postgres 16 en un servidor casero, accedido desde Vercel por proxy WebSocket + Cloudflare Access. Ya no se usa Supabase (su proyecto quedó pausado; `supabase/migrations/` es solo historial). Referencia completa: `docs/base-de-datos.md`.

## Stack
Next 16 (App Router, TS, Tailwind v4) · Postgres 16 propio (Drizzle ORM + `@neondatabase/serverless`) · sesión por cookie JWT (`jose`) · fotos en la base (`bytea`) · sin librerías de canvas (pan/zoom hecho a medida, limitado al tablero).

## Comandos
- `npm run dev` / `npm run build` / `npm run lint` / `npx tsc --noEmit` (requieren Node ≥ 20; en esta Mac el shell usa 18: `export PATH=~/.nvm/versions/node/v24.16.0/bin:$PATH`).
- Variables en `.env.local` (plantilla `.env.local.example`): `DATABASE_URL` (host `pg-wishlist`), `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `SESSION_SECRET`, `MIGRATE_DATABASE_URL` (solo Mac, vía túnel).
- Base de datos (con el túnel abierto: `ssh -N -L 5433:localhost:5432 servidor`): `npm run db:migrate` · `db:status` · `db:down` (revierte la última) · `db:seed` (demo) · `db:import-supabase` (importación única, ya hecha). Nunca se migra desde Vercel. Detalles y diagnóstico en `docs/base-de-datos.md`.

## Arquitectura
```
src/
  proxy.ts                 valida la cookie de sesión y manda a /login en rutas privadas (públicas: /, /ver, /login, /api/img|items|health)
  app/
    layout.tsx             fuentes (Geist + Caveat para el texto "a mano")
    login/                 página + server actions signIn/signOut (cookie `wl_session`)
    api/                   health (select 1) · img/[id] (foto bytea) · items/[space] (lista pública, la consulta el sondeo) · link-preview y link-image (exigen sesión)
    (app)/layout.tsx       header (SpaceNav + salir)
    (app)/page.tsx         PORTADA pública: tablero compartido en solo lectura
    (app)/ver/[space]      solo lectura pública de cris|melck (shared → /); /ver → /
    (app)/editar/[space]   tableros EDITABLES (exigen login; editas el tuyo y el compartido); /editar → /editar/shared
  features/board/
    SpaceBoard.tsx         (server) carga items del espacio + calcula canEdit
    BoardClient.tsx        estado de items, diálogos, sondeo cada 5 s (sin realtime), FAB "+ pegar algo" (dentro del tablero, abajo a la derecha), gestos → guarda con layoutItem
    BoardStage.tsx         corcho de ancho lógico 1200; en escritorio el tablero tiene alto fijo (ancho/1.75) y se escala (k ≤ 2.5) para que todas las tarjetas quepan sin scroll; en móvil k ≥ 0.6 y se desliza; `ScaleContext`
    Sign.tsx               título «carta de rescate» (letras en public/letras) + subtítulo del espacio
    cards.tsx              `Card`: todos los estilos de tarjeta en CSS + sujetador (pin/cinta/clip) + sellos + insignia de casillero
    BoardItem.tsx          posición de la tarjeta: arrastrar, pellizco (tamaño+giro), Ctrl+rueda (tamaño), Shift+rueda (giro); clic = detalle
    ItemForm.tsx           formulario con vista previa viva, estilo/papel/tinta/sujetador/emoji/código/inclinación (pegar foto con Ctrl/⌘+V)
    ItemView.tsx           detalle completo
    items.ts               envoltorios cliente de las acciones (crea el FormData con la foto)
    actions.ts             server actions: TODAS las escrituras (crear, editar, mover, estado, reservar, borrar); validan sesión y `writable(owner)` en el WHERE
    placement.ts           ancho lógico, `box()` (tamaño visual con escala), clamp y primer hueco libre (izq→der, arriba→abajo)
    image.ts               redimensiona fotos a JPEG ≤ 900px
  app/board.css            marco, corcho, encaje, pestañas, letrero, tarjetas, sellos, FAB (clases globales del diseño)
  components/              SpaceNav (pestañas de papel) · BoardMenu (hamburguesa de papel arriba a la derecha: ver como visitante / editar / acomodar tarjetas / salir)
  db/  schema.ts (Drizzle: items, item_images) · index.ts (`withDb`: Pool de 2 por petición, WSS con cabeceras CF-Access) · items.ts (mapeo fila→Item, reservar atómico)
  lib/  types.ts · spaces.ts (etiquetas, tipos, monedas) · auth.ts · session.ts (JWT con jose)
drizzle/                   migraciones vigentes (0000_init, 0001_updated_at_trigger) + down/ con su reversa
scripts/                   db-migrate.ts, db-seed.ts, import-supabase.ts, make-favicon.py
supabase/migrations/       (HISTORIAL, ya no se usa) 0001 esquema + RLS + bucket `item-images` · 0002 `category` · 0003 lectura pública de `items` · 0004 reubica tarjetas al corcho de 1200 · 0005 estilo/papel/tinta/sujetador/escala/z/emoji/bg/code + categoría `nota` · 0006 RPC `reserve_item` (reservar/liberar en el tablero ajeno, solo con sesión y perfil; no guarda quién) · 0008 estilo `recibo` · 0007 reacomoda las tarjetas en filas (opcional; la app también lo hace con «Acomodar tarjetas»)
design-src/                originales sin procesar (NO van al repo ni se sirven; ver .gitignore)
```

## Despliegue
- Repo público: https://github.com/casm2203/wishlistweb (rama `main`). Commits con el correo noreply de GitHub; `.env*` y `design-src/` están en `.gitignore`.
- Dominio propio: https://wishlist.cristiansuarez.me (CNAME `wishlist` → `9d8dfe04f2c3d43d.vercel-dns-017.com` en Porkbun, que aloja el DNS de cristiansuarez.me; dominio añadido al proyecto de Vercel).
- Producción en Vercel: https://wishlistweb.vercel.app (proyecto `wishlistweb`, equipo `casm2203s-projects`, conectado al repo: cada push a `main` despliega). `vercel.json` fija `framework: nextjs` (sin eso Vercel lo servía como estático y daba 404).
- Variables en Vercel: `DATABASE_URL`, `SESSION_SECRET` y `CF_ACCESS_CLIENT_ID/SECRET` en Production y Preview (secretas; nunca imprimirlas ni commitearlas). `MIGRATE_DATABASE_URL` NO va en Vercel.
- Infraestructura: Vercel → `wss://db.cristiansuarez.me` → Cloudflare Access → túnel → wsproxy → Postgres (portátil en casa, Docker). Si el portátil está apagado o en Windows la app da error; `/api/health` responde 503. Respaldo diario a las 3:00 (`pg_dumpall` a Drive).
- Se usó la CLI de Vercel (`vercel deploy --prod --scope casm2203s-projects`); el MCP de Vercel no tiene permiso de escritura en esa cuenta.

## Reglas de negocio
- Ambos **ven** los 3 espacios; **editan** solo el propio y el compartido (validado en las server actions con `writable(owner)`; `canEdit` en UI es solo comodidad).
- Item: `category` (articulo | cine | viaje | nota, define el fondo y tamaño en `CATEGORIES` de `lib/spaces.ts`), nombre, descripción, precio+moneda, enlace, foto, `needs_locker` (casillero), `kind` (want/buy/gift), `status` (pending/reserved/bought), posición x/y/rotación en coordenadas del mundo.
- Navegación del tablero: arrastrar fondo = mover; Ctrl/⌘+rueda, pellizco, `+`/`-` o botones = zoom; "Ver todo" encuadra. El tablero nunca se sale de la vista y las tarjetas no pueden salir del corcho.
- Pin: el color es "aleatorio" pero estable (`pinFor(id)` en `lib/spaces.ts`, hash del id sobre los 9 colores); ya no indica la intención, eso se ve en el detalle. Los viajes usan el ganchito. El casillero solo aplica a artículos.
- Calidad: el marco es CSS y el corcho es la foto `public/corcho.webp` (recorte de `design-src/tablero2.png`, generada con ChatGPT); las fotos de artículos no pasan por `next/image` (reencodaría).
- Click sin arrastrar en una polaroid abre el detalle; arrastrar la mueve y guarda al soltar.
- Letrero: Cris y compartido usan `aviso-cris`, Melck `aviso-melck` (config en `SPACES`). La zona del letrero está reservada al colocar tarjetas nuevas (`BANNER` en placement.ts); las tarjetas pueden arrastrarse encima y lo tapan.
- Rutas: `/` y `/ver/*` son de solo lectura (`readOnly` → `canEdit=false` para todos); `/editar/*` exige sesión. `SpaceNav` cambia sus enlaces según la ruta y `ModeLink` (abajo a la izquierda) ofrece "Iniciar sesión para editar" / "Editar mi tablero" / "Ver como visitante". Tras el login se va a `/editar/<su tablero>`; `/cris` y `/melck` redirigen a `/ver/*`. La lectura es pública para que alguien externo pueda mirar: `proxy` deja pasar `/ver` (`PUBLIC_PREFIXES`) y `/api/items/*` e `/api/img/*` también son públicos. Escribir exige sesión (server actions). Ojo: cualquiera con el enlace ve los 3 tableros completos, incluidos los regalos.
- Autocompletar: en el formulario, pegar un enlace llama a `/api/link-preview` (Open Graph + JSON-LD) y `/api/link-image`; ambos exigen sesión y bloquean IPs privadas (SSRF, `lib/safeFetch.ts`). En tiendas VTEX (fichas `/<slug>/p`, p. ej. Vélez) el HTML llega sin esas etiquetas: si falta precio o foto se consulta el catálogo público de la tienda (`parseVtexCatalog` en `lib/linkPreview.ts`; respeta `?idsku=` y deduce la moneda del dominio .co/.mx). Solo rellena campos vacíos; si el sitio bloquea (p. ej. sin precio en Open Graph) se completa a mano.
- Móvil: nav compacta (nombres cortos), zoom inicial 0.36 sobre el letrero en pantallas <640 px, formulario sin rotación. Los gestos táctiles reales (pellizco) no se probaron: el navegador de pruebas emula con ratón.
- Los enlaces solo se renderizan si son `http(s)`.

## Convenciones
- Textos de UI en español. Componentes de cliente solo donde hay interacción; datos iniciales vienen de Server Components.
- No leer refs durante render (regla `react-hooks/refs` activa).

## Pendientes
- [x] Migración Supabase → Postgres propio (22 nov 2026): esquema Drizzle, 1 item + foto importados, variables en Vercel, producción probada (login, reservar/liberar, foto, mover, borrar). Proyecto de Supabase pausado.
- [x] El formulario no deja guardar mientras se procesa la foto («Preparando foto…»).
- [ ] Actualizar Next 16.4.3 (el build avisa de una vulnerabilidad conocida).
- [ ] Login por nombre sin contraseña: cualquiera con la URL de `/login` entra como Cris o Melck; valorar un PIN por persona.
- [ ] Sin plan B si el portátil cae (sin réplica). Repetir `restore-test.sh` del servidor cuando haya más datos reales.
- [ ] Revisar con el usuario: pines sin usar (negro, rosa, cian, amarillo, menta, morado), zona de texto de los tickets y capacidad (~35-40 artículos por tablero).
- [ ] Probar el pegado real con Ctrl/⌘+V (se probó subiendo archivo) y la edición completa desde la UI.
- [ ] Zoom con rueda simple para usuarios de mouse (hoy rueda = mover; zoom = Ctrl/⌘+rueda).
- [ ] Minimapa y selección múltiple en el tablero.
- [ ] Ordenar/filtrar por tipo, estado y casillero.
