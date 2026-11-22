-- Mantiene items.updated_at al día en cada UPDATE (equivalente a touch_updated_at de Supabase).
CREATE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER items_touch_updated_at
BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
