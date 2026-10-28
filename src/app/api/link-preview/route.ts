import { NextResponse, type NextRequest } from "next/server";
import { parseLinkPreview } from "@/lib/linkPreview";
import { safeFetch } from "@/lib/safeFetch";
import { createClient } from "@/lib/supabase/server";

/** Lee nombre, foto y precio de un enlace de producto. Solo para usuarios con sesión. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const target = request.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "Falta el enlace" }, { status: 400 });

  try {
    const page = await safeFetch(target, { accept: "text/html,application/xhtml+xml", maxBytes: 1_500_000 });
    if (!/html|xml/i.test(page.contentType)) throw new Error("El enlace no es una página web");
    return NextResponse.json(parseLinkPreview(page.body.toString("utf8"), page.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo leer el enlace";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
