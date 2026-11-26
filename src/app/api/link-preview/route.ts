import { NextResponse, type NextRequest } from "next/server";
import { parseLinkPreview, parseVtexCatalog, vtexCatalogUrl, type LinkPreview } from "@/lib/linkPreview";
import { safeFetch } from "@/lib/safeFetch";
import { currentOwner } from "@/lib/session";

/** Lee nombre, foto y precio de un enlace de producto. Solo para usuarios con sesión. */
export async function GET(request: NextRequest) {
  if (!(await currentOwner())) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const target = request.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "Falta el enlace" }, { status: 400 });

  try {
    const page = await safeFetch(target, { accept: "text/html,application/xhtml+xml", maxBytes: 1_500_000 });
    if (!/html|xml/i.test(page.contentType)) throw new Error("El enlace no es una página web");
    const preview = parseLinkPreview(page.body.toString("utf8"), page.url);
    return NextResponse.json(await withVtexFallback(preview, page.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo leer el enlace";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

/** Si al HTML le falta precio o foto y parece una ficha VTEX, completa con el catálogo de la tienda. */
async function withVtexFallback(preview: LinkPreview, pageUrl: URL): Promise<LinkPreview> {
  const catalog = vtexCatalogUrl(pageUrl);
  if (!catalog || (preview.price && preview.image)) return preview;
  try {
    const res = await safeFetch(catalog, { accept: "application/json", maxBytes: 3_000_000 });
    const found = parseVtexCatalog(res.body.toString("utf8"), pageUrl);
    if (!found) return preview;
    return {
      title: found.title ?? preview.title,
      description: found.description ?? preview.description,
      image: found.image ?? preview.image,
      price: found.price ?? preview.price,
      currency: found.currency ?? preview.currency,
    };
  } catch {
    return preview; // no era VTEX o el catálogo no respondió
  }
}
