# Base de datos

La app ya no usa Supabase. Los datos viven en el Postgres 16 del servidor casero (base y rol `wishlist`).
Auth, Storage, Realtime y RLS de Supabase se reemplazaron por código de la app (ver «Decisiones»).

## Cómo llega la app a la base

```
Vercel (Node.js) → wss://db.cristiansuarez.me/v1?address=pg-wishlist:5432
  → Cloudflare Access (token de servicio) → túnel → wsproxy → Postgres
```

- Postgres no tiene puerto público. Solo el rol `wishlist` entra a la base `wishlist`.
- Límites del rol: 10 conexiones, `statement_timeout` 15 s, `idle_in_transaction_session_timeout` 30 s.
- Driver: `@neondatabase/serverless` (Pool sobre WebSocket) + `drizzle-orm/neon-serverless`. Configuración en
  [`src/db/index.ts`](../src/db/index.ts): clase `WebSocketConAccess` (cabeceras `CF-Access-*`), `wsProxy` como función.
- `withDb(fn)` crea un Pool de máx. 2 conexiones **por petición** y lo cierra en `finally`. Nada de pools globales.
- Todo el código de base corre en runtime Node.js (con Cache Components el runtime por defecto; no usar Edge: allí no
  existe `ws` con cabeceras). `withDb` llama a `connection()` para que nunca se consulte al prerenderizar en el build.
- Si el portátil está en Windows la base no está disponible: las páginas dan error y `/api/health` responde 503.

## Variables (sin valores)

| Variable | Dónde | Para qué |
|---|---|---|
| `DATABASE_URL` | Vercel y `.env.local` | `postgres://wishlist:<PW>@pg-wishlist:5432/wishlist`. El host **debe ser `pg-wishlist`**, no `db.cristiansuarez.me`. |
| `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` | Vercel y `.env.local` | Token de servicio de Cloudflare Access. |
| `SESSION_SECRET` | Vercel y `.env.local` | Firma la cookie de sesión (≥ 32 caracteres). `openssl rand -base64 48`. |
| `MIGRATE_DATABASE_URL` | Solo `.env.local` (Mac) | `postgresql://wishlist:<PW>@localhost:5433/wishlist`, vía túnel SSH. **Nunca en Vercel.** |

`.env*` está en `.gitignore`; la plantilla es `.env.local.example`. Las `LOGIN_*` y `NEXT_PUBLIC_SUPABASE_*` ya no se usan
(`NEXT_PUBLIC_SUPABASE_*` solo las lee el script de importación único).

## Tablas

Esquema en [`src/db/schema.ts`](../src/db/schema.ts) (Drizzle). Migraciones SQL en `drizzle/`.

- **`items`**: el tablero. Mismas columnas y CHECK que en Supabase (espacio `cris|melck|shared`, categoría, estilo,
  colores `#rrggbb`, escala 0.5–2.2, etc.). Cambios: `image_url` → `image_id uuid` (FK a `item_images`, `ON DELETE SET NULL`);
  `created_by` pasa de uuid de `auth.users` a `'cris' | 'melck'`. Índices por `space` y `image_id`.
  El trigger `items_touch_updated_at` mantiene `updated_at`.
- **`item_images`**: `id`, `data bytea`, `content_type`, `created_at`. Fotos JPEG ≤ 900 px, servidas por `/api/img/<id>`
  con caché inmutable. Al borrar o reemplazar la foto de un item se borra la fila huérfana (cierra el pendiente de limpiar Storage).
- No hay tabla de usuarios: son dos personas fijas.

Las fechas son siempre `timestamptz`; el `price` es `numeric(12,2)` y la API lo entrega como número.

## Migrar, revertir, estado y semilla

Siempre desde la Mac, por túnel SSH (en otra terminal): `ssh -N -L 5433:localhost:5432 servidor`
(fuera de casa: `casm@100.118.139.46` por Tailscale). Requiere Node ≥ 20.

```bash
npm run db:migrate    # aplica las pendientes
npm run db:status     # aplicadas / pendientes
npm run db:down       # revierte la ÚLTIMA (usa drizzle/down/<tag>.sql; pide revisar el SQL, borra datos en 0000)
npm run db:seed       # 4 tarjetas «[DEMO]» (solo desarrollo); `npm run db:seed -- clean` las quita
npm run db:import-supabase -- dry   # cuenta lo que hay en Supabase; sin `dry` lo importa (idempotente, conserva ids)
```

Para cambiar el esquema: editar `src/db/schema.ts`, `npx drizzle-kit generate --name <cambio>`, escribir su
`drizzle/down/<tag>.sql`, revisar el SQL y correr `db:migrate`. Las migraciones NO se ejecutan en Vercel ni en el build.

## Decisiones

- **Sesión**: cookie `wl_session` (JWT HS256 con `jose`, 30 días, httpOnly). El login sigue siendo «escribe cris o melck»
  sin contraseña (decisión previa del producto): quien conozca la URL de `/login` puede entrar como cualquiera.
  Si eso deja de ser aceptable, añadir un PIN por persona.
- **Permisos** (antes RLS): cada server action exige sesión y filtra con `writable(owner)` (`space = 'shared' OR space = owner`)
  en el propio `WHERE`. Reservar (antes `reserve_item`) es un `UPDATE` atómico solo sobre el tablero ajeno y solo pending↔reserved.
  La lectura es pública (portada y `/ver`), igual que antes.
- **Escrituras por el servidor**: crear/editar/mover/borrar/reservar son server actions; las fotos viajan como `FormData`
  (límite de acciones subido a 4 MB en `next.config.ts`).
- **Sin realtime**: Vercel no mantiene conexiones largas. El tablero consulta `/api/items/<space>` cada 5 s mientras la
  pestaña está visible y no pisa lo que se arrastra o se está guardando.
- **Drizzle** por tipado y migraciones; no soporta `down`, por eso hay `drizzle/down/*.sql` y un runner propio.

## Diagnóstico

| Síntoma | Causa probable |
|---|---|
| `/api/health` → 503 | La base no responde o falla la conexión; mirar los logs de Vercel. |
| 403 al conectar | Faltan o están mal `CF_ACCESS_CLIENT_ID/SECRET`. |
| `pg_hba.conf rejects` | El host de `DATABASE_URL` no es `pg-wishlist`, o rol/base incorrectos. |
| Timeout | El portátil puede estar en Windows (base caída), o el túnel está caído. |
| `Falta DATABASE_URL` / `Falta SESSION_SECRET` | Variable no cargada en ese entorno (Vercel: Production, Preview y Development son independientes). |
