import { getCurrentOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Item, Space } from "@/lib/types";
import { BoardClient } from "./BoardClient";

/** Carga los artículos de un espacio y decide si el usuario actual puede editarlo. */
export async function SpaceBoard({ space, readOnly = false }: { space: Space; readOnly?: boolean }) {
  const supabase = await createClient();
  const [owner, { data }] = await Promise.all([
    getCurrentOwner(),
    supabase.from("items").select("*").eq("space", space).order("created_at"),
  ]);
  const canEdit = !readOnly && (space === "shared" || space === owner);
  return <BoardClient key={space} space={space} initialItems={(data ?? []) as Item[]} canEdit={canEdit} />;
}
