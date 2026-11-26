export interface LinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  price: number | null;
  currency: string | null;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();

function metaContent(html: string, keys: string[]): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!key || !keys.includes(key)) continue;
    const content = /content\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag);
    const value = content?.[2] ?? content?.[3];
    if (value) return decode(value);
  }
  return null;
}

function parsePrice(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).replace(/[^\d.,]/g, "");
  if (!s) return null;
  // "1.234,56" → 1234.56 · "1,234.56" → 1234.56 · "49,99" → 49.99
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const normalized =
    lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface JsonLdNode {
  "@type"?: string | string[];
  "@graph"?: JsonLdNode[];
  name?: string;
  image?: string | string[] | { url?: string };
  description?: string;
  offers?: JsonLdNode | JsonLdNode[];
  price?: string | number;
  lowPrice?: string | number;
  priceCurrency?: string;
}

function productFromJsonLd(html: string): JsonLdNode | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, body] of blocks) {
    try {
      const data = JSON.parse(body) as JsonLdNode | JsonLdNode[];
      const queue = Array.isArray(data) ? [...data] : [data];
      while (queue.length) {
        const node = queue.shift()!;
        if (node["@graph"]) queue.push(...node["@graph"]);
        const type = ([] as string[]).concat(node["@type"] ?? []);
        if (type.includes("Product")) return node;
      }
    } catch {
      // JSON-LD mal formado: se ignora
    }
  }
  return null;
}

/** Extrae lo básico de una página de producto: Open Graph, JSON-LD y, si no, <title>. */
export function parseLinkPreview(html: string, baseUrl: URL): LinkPreview {
  const product = productFromJsonLd(html);
  const offer = product?.offers ? ([] as JsonLdNode[]).concat(product.offers)[0] : undefined;
  const ldImage = product?.image
    ? typeof product.image === "string"
      ? product.image
      : Array.isArray(product.image)
        ? product.image[0]
        : product.image.url
    : null;

  const title =
    metaContent(html, ["og:title", "twitter:title"]) ??
    product?.name ??
    decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "") ??
    null;
  const image = metaContent(html, ["og:image", "og:image:url", "twitter:image"]) ?? ldImage ?? null;

  return {
    title: title || null,
    description: metaContent(html, ["og:description", "twitter:description", "description"]) ?? product?.description ?? null,
    image: image ? new URL(image, baseUrl).toString() : null,
    price: parsePrice(
      metaContent(html, ["product:price:amount", "og:price:amount"]) ?? offer?.price ?? offer?.lowPrice,
    ),
    currency: metaContent(html, ["product:price:currency", "og:price:currency"]) ?? offer?.priceCurrency ?? null,
  };
}

/**
 * Las tiendas VTEX (p. ej. Vélez) pintan las etiquetas del producto con JavaScript, así que el HTML
 * del servidor llega sin ellas. Sus fichas terminan en `/<slug>/p` y el catálogo público sí las da.
 */
export function vtexCatalogUrl(page: URL): string | null {
  const slug = /^\/([^/]+)\/p\/?$/.exec(page.pathname)?.[1];
  return slug ? `${page.origin}/api/catalog_system/pub/products/search/${slug}/p` : null;
}

interface VtexProduct {
  productName?: string;
  description?: string;
  items?: {
    itemId?: string;
    images?: { imageUrl?: string }[];
    sellers?: { commertialOffer?: { Price?: number; AvailableQuantity?: number } }[];
  }[];
}

/** El catálogo no dice la moneda: se deduce del país del dominio. */
const CURRENCY_BY_SUFFIX: [string, string][] = [
  [".co", "COP"],
  [".mx", "MXN"],
];

export function parseVtexCatalog(json: string, page: URL): LinkPreview | null {
  const data = JSON.parse(json) as VtexProduct[];
  const product = Array.isArray(data) ? data[0] : undefined;
  if (!product) return null;

  const items = product.items ?? [];
  const offerOf = (i: (typeof items)[number]) => i.sellers?.[0]?.commertialOffer;
  const inStock = (i: (typeof items)[number]) => (offerOf(i)?.AvailableQuantity ?? 0) > 0;
  // La variante del enlace (?idsku=); si está agotada, su precio no es fiable y se usa una disponible.
  const wanted = items.find((i) => i.itemId === page.searchParams.get("idsku"));
  const item = (wanted && inStock(wanted) ? wanted : items.find(inStock)) ?? wanted ?? items[0];

  return {
    title: product.productName?.trim() || null,
    description: decode((product.description ?? "").replace(/<[^>]*>/g, " ")) || null,
    image: (wanted ?? item)?.images?.[0]?.imageUrl ?? null,
    price: (item && offerOf(item)?.Price) || null,
    currency: CURRENCY_BY_SUFFIX.find(([suffix]) => page.hostname.endsWith(suffix))?.[1] ?? null,
  };
}
