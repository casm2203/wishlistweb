import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Item, Space } from "@/lib/types";
import { BoardClient } from "./BoardClient";

/** Carga los artículos de un espacio y decide si el usuario actual puede editarlo. */
export async function SpaceBoard({ space, readOnly = false }: { space: Space; readOnly?: boolean }) {
  const supabase = await createClient();
  const [viewer, { data }] = await Promise.all([
    getViewer(),
    supabase.from("items").select("*").eq("space", space).order("created_at"),
  ]);
  const owner = viewer.owner;
  const canEdit = !readOnly && (space === "shared" || space === owner);
  // Reservar: solo con sesión y perfil, en el tablero de la otra persona (nunca el propio ni el compartido).
  const reserve: "yes" | "login" | "no" =
    space === "shared" || space === owner ? "no" : owner ? "yes" : viewer.loggedIn ? "no" : "login";
  return (
    <BoardClient
      key={space}
      space={space}
      initialItems={(data ?? []) as Item[]}
      canEdit={canEdit}
      readOnly={readOnly}
      reserve={reserve}
    />
  );
}
