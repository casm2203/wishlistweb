CREATE TABLE "item_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" "bytea" NOT NULL,
	"content_type" text DEFAULT 'image/jpeg' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space" text NOT NULL,
	"category" text DEFAULT 'articulo' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" numeric(12, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"url" text,
	"image_id" uuid,
	"needs_locker" boolean DEFAULT false NOT NULL,
	"kind" text DEFAULT 'want' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"x" double precision DEFAULT 0 NOT NULL,
	"y" double precision DEFAULT 0 NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"style" text,
	"paper" text,
	"ink" text,
	"holder" text,
	"holder_color" text,
	"bg" text,
	"emoji" text,
	"code" text,
	"scale" real DEFAULT 1 NOT NULL,
	"z" integer DEFAULT 1 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_space_check" CHECK ("items"."space" in ('cris','melck','shared')),
	CONSTRAINT "items_name_check" CHECK (char_length("items"."name") between 1 and 120),
	CONSTRAINT "items_category_check" CHECK ("items"."category" in ('articulo','cine','viaje','nota')),
	CONSTRAINT "items_kind_check" CHECK ("items"."kind" in ('want','buy','gift')),
	CONSTRAINT "items_status_check" CHECK ("items"."status" in ('pending','reserved','bought')),
	CONSTRAINT "items_style_check" CHECK ("items"."style" in ('polaroid','estampilla','recibo','boleta','pelicula','correo','postit','cuaderno','clasica','ficha')),
	CONSTRAINT "items_holder_check" CHECK ("items"."holder" in ('pin','tape','clip','none')),
	CONSTRAINT "items_paper_check" CHECK ("items"."paper" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "items_ink_check" CHECK ("items"."ink" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "items_holder_color_check" CHECK ("items"."holder_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "items_bg_check" CHECK ("items"."bg" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "items_emoji_check" CHECK (char_length("items"."emoji") <= 16),
	CONSTRAINT "items_code_check" CHECK (char_length("items"."code") <= 4),
	CONSTRAINT "items_scale_check" CHECK ("items"."scale" between 0.5 and 2.2),
	CONSTRAINT "items_created_by_check" CHECK ("items"."created_by" in ('cris','melck'))
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_image_id_item_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."item_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_space_idx" ON "items" USING btree ("space");--> statement-breakpoint
CREATE INDEX "items_image_idx" ON "items" USING btree ("image_id");