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
