import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/** Rutas visibles sin sesión: portada, vistas de solo lectura, login y lectura de datos/fotos. */
const PUBLIC_PREFIXES = ["/login", "/ver", "/api/img", "/api/items", "/api/health"];
const isPublic = (path: string) => path === "/" || PUBLIC_PREFIXES.some((p) => path.startsWith(p));

/** Manda a /login a quien intente entrar a una ruta privada sin sesión válida. */
export async function proxy(request: NextRequest) {
  if (isPublic(request.nextUrl.pathname)) return NextResponse.next();
  const owner = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (owner) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
