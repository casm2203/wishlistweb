# Versión 3 — fases

Referencia de diseño: artefacto «Wishlist · Cris y Melck — propuesta» (https://claude.ai/artifact/PvdkHKqCfjLQFiNpymBmr6).
Novedades del prototipo v3 frente a la v2: título tipo «carta de rescate» (letras recortadas), login estilo boleta «ACCESO Nº 0001»,
nuevo estilo `recibo` (artículo), prioridad (Lo quiero / Por comprar / Para regalar), botón ojo «ver como visitante» y dock con zoom ± .

## Historial (sesiones anteriores de este repo)

| Sesión | Fecha | Qué se hizo |
|---|---|---|
| Tablero de deseos con notas visuales | 27–28 oct | v1: 3 espacios, pan/zoom, polaroids, Supabase (esquema, RLS, Realtime), tablero HD con marco, categorías artículo/cine/viaje, avisos, favicon ✨, pines aleatorios, repo público + Vercel + subdominio, portada de solo lectura |
| Análisis de artefacto nuevo / v2 | 3–5 nov | Fases A–D: corcho con marco CSS, 9 estilos de tarjeta, bandeja de creación, reserva con sesión (RPC `reserve_item`), limpieza de assets, ajustes de tamaño (revertidos) |
| Esta (v3) | 5 nov | Análisis del prototipo v3 + login sin contraseña |

## Fases v3

- **Fase 0 — Login por nombre** ✅ escribir `cris` o `melck`, sin contraseña. Credenciales en variables de servidor `LOGIN_*`.
- **Fase 1 — Título «carta de rescate»** ✅ letras recortadas del prototipo (`public/letras/*.webp`) por espacio; `C` y `r` (no existen en el prototipo) se dibujan como papelitos CSS. Reemplaza el letrero de madera en `Sign.tsx`.
- **Fase 2 — Pantalla de acceso v3** ✅ ficha de biblioteca con cinta rosa, «ACCESO · Nº 0001», título de letras recortadas y un solo campo «¿Quién eres?» (variante activa del prototipo: `l1 lf2 t1 b1`).
- **Fase 3 — Datos** ✅ en código: estilo `recibo` (artículo), migración `0008_recibo_style.sql` (aplicada en Supabase). La prioridad ya existía como `kind` (Lo quiero / Por comprar / Para regalar). «Ideas sueltas» no se aplicó: en el prototipo solo es el nombre plural del grupo de notas.
- **Fase 4 — Controles** ✅ dock abajo a la izquierda del tablero: ojo «ver como visitante» (solo editando), zoom −/+ y «ver todo» (aparece al hacer zoom). «+ pegar algo» se queda como botón rosa abajo a la derecha.
- **Fase 5 — Formulario/detalle** ✅ prioridad como cinta washi de color en el detalle (el formulario ya la tenía), confirmación de borrado en la hoja (sin `confirm()`), CTA «yo se lo regalo 🎁» y aviso «ya está reservado/comprado» para quien mira. Los tres estados ya existían.
- **Fase 6 — Pulido y despliegue** 🟡 probado en local con sesión de Cris y de Melck (login por nombre, permisos, crear, persistir, estados, reservar/liberar entre cuentas, borrar, móvil 375 px, build de producción). Corcho de ChatGPT (`public/corcho.webp`) como fondo del tablero. **Falta:** añadir `LOGIN_*` en Vercel y desplegar.

> Pendiente de confirmar con Cris: qué variante de título/login del prototipo usar y si el nombre «Ideas sueltas» sustituye a «Nota».
