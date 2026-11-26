import { getViewer } from "@/lib/auth";
import { withDb } from "@/db";
import { listItems } from "@/db/items";
import type { Space } from "@/lib/types";
import { BoardClient } from "./BoardClient";

/** Carga los artículos de un espacio y decide si el usuario actual puede editarlo. */
export async function SpaceBoard({ space, readOnly = false }: { space: Space; readOnly?: boolean }) {
  const [viewer, list] = await Promise.all([getViewer(), withDb((db) => listItems(db, space))]);
  const owner = viewer.owner;
  const canEdit = !readOnly && (space === "shared" || space === owner);
  // Reservar: solo con sesión y perfil, en el tablero de la otra persona (nunca el propio ni el compartido).
  const reserve: "yes" | "login" | "no" =
    space === "shared" || space === owner ? "no" : owner ? "yes" : viewer.loggedIn ? "no" : "login";
  const editHref = !owner ? null : `/editar/${space === "shared" || space === owner ? space : owner}`;
  return (
    <BoardClient
      key={space}
      space={space}
      editHref={editHref}
      initialItems={list}
      canEdit={canEdit}
      readOnly={readOnly}
      reserve={reserve}
    />
  );
}
