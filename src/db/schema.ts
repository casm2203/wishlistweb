import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Columna `bytea` que se lee y escribe como `Buffer`.
 * toDriver: recibe un Buffer/Uint8Array y lo pasa tal cual al driver.
 * fromDriver: el driver de Neon entrega `Buffer` (o hex "\x..." en algunos modos); se normaliza a Buffer.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer | string }>({
  dataType: () => "bytea",
  toDriver: (value) => value,
  fromDriver: (value) => (typeof value === "string" ? Buffer.from(value.replace(/^\\x/, ""), "hex") : value),
});

/** Fotos de las tarjetas (JPEG ≤ 900 px, decenas de KB) guardadas en la propia base. */
export const itemImages = pgTable("item_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  data: bytea("data").notNull(),
  contentType: text("content_type").notNull().default("image/jpeg"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Artículos del tablero (misma forma que la tabla de Supabase, sin auth.users ni storage). */
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    space: text("space").notNull(),
    category: text("category").notNull().default("articulo"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    price: numeric("price", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    url: text("url"),
    imageId: uuid("image_id").references(() => itemImages.id, { onDelete: "set null" }),
    needsLocker: boolean("needs_locker").notNull().default(false),
    kind: text("kind").notNull().default("want"),
    status: text("status").notNull().default("pending"),
    x: doublePrecision("x").notNull().default(0),
    y: doublePrecision("y").notNull().default(0),
    rotation: real("rotation").notNull().default(0),
    style: text("style"),
    paper: text("paper"),
    ink: text("ink"),
    holder: text("holder"),
    holderColor: text("holder_color"),
    bg: text("bg"),
    emoji: text("emoji"),
    code: text("code"),
    scale: real("scale").notNull().default(1),
    z: integer("z").notNull().default(1),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("items_space_idx").on(t.space),
    index("items_image_idx").on(t.imageId),
    check("items_space_check", sql`${t.space} in ('cris','melck','shared')`),
    check("items_name_check", sql`char_length(${t.name}) between 1 and 120`),
    check("items_category_check", sql`${t.category} in ('articulo','cine','viaje','nota')`),
    check("items_kind_check", sql`${t.kind} in ('want','buy','gift')`),
    check("items_status_check", sql`${t.status} in ('pending','reserved','bought')`),
    check(
      "items_style_check",
      sql`${t.style} in ('polaroid','estampilla','recibo','boleta','pelicula','correo','postit','cuaderno','clasica','ficha')`,
    ),
    check("items_holder_check", sql`${t.holder} in ('pin','tape','clip','none')`),
    check("items_paper_check", sql`${t.paper} ~ '^#[0-9a-fA-F]{6}$'`),
    check("items_ink_check", sql`${t.ink} ~ '^#[0-9a-fA-F]{6}$'`),
    check("items_holder_color_check", sql`${t.holderColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check("items_bg_check", sql`${t.bg} ~ '^#[0-9a-fA-F]{6}$'`),
    check("items_emoji_check", sql`char_length(${t.emoji}) <= 16`),
    check("items_code_check", sql`char_length(${t.code}) <= 4`),
    check("items_scale_check", sql`${t.scale} between 0.5 and 2.2`),
    check("items_created_by_check", sql`${t.createdBy} in ('cris','melck')`),
  ],
);
