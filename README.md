# Wishlist · Cris y Melck

Tablero de deseos para dos personas: tres tableros de corcho (Cris, Melck y uno compartido) donde cada
artículo, entrada de cine o viaje es una tarjeta pegada con pin o ganchito. Se mueven, se acercan y se
actualizan en vivo entre las dos cuentas. Hecho con Next.js 16, Tailwind 4 y Supabase.

- `/` (portada) y `/ver/cris`, `/ver/melck`: solo lectura, públicos. Abajo hay un botón para iniciar sesión.
- `/editar/*`: tableros editables (requieren iniciar sesión; cada quien edita el suyo y el compartido).
- Al agregar un artículo se puede pegar un enlace y se rellenan nombre, foto y precio cuando el sitio lo permite.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta en orden `supabase/migrations/*.sql`.
2. En *Authentication → Users* crea las dos cuentas (correo y contraseña) y asígnalas:

   ```sql
   insert into public.profiles (user_id, owner) values
     ('<uuid de Cris>', 'cris'),
     ('<uuid de Melck>', 'melck');
   ```

3. Copia `.env.local.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. `npm install` y `npm run dev`.

Más contexto de arquitectura y decisiones en [`CLAUDE.md`](CLAUDE.md).

> Los datos del proyecto (usuarios, artículos, fotos) viven en Supabase y no forman parte del repositorio.
> `/ver` es pública por diseño: cualquiera con el enlace puede leer los tableros.
