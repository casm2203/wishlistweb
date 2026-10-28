import { NextResponse, type NextRequest } from "next/server";
import { safeFetch } from "@/lib/safeFetch";
import { createClient } from "@/lib/supabase/server";

/** Descarga la foto de un producto para que el navegador la reduzca y la suba (evita bloqueos CORS). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const target = request.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });

  try {
    const img = await safeFetch(target, { accept: "image/*", maxBytes: 8_000_000 });
    if (!/^image\/(jpeg|png|webp|gif|avif)/i.test(img.contentType)) throw new Error("No es una imagen válida");
    return new NextResponse(new Uint8Array(img.body), {
      headers: { "content-type": img.contentType, "cache-control": "private, max-age=300" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo descargar la imagen";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
