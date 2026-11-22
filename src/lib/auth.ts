import { cache } from "react";
import { currentOwner } from "@/lib/session";
import type { Owner } from "@/lib/types";

/** Quién mira la página: sin sesión (visitante) o con sesión y su dueño. */
export const getViewer = cache(async (): Promise<{ loggedIn: boolean; owner: Owner | null }> => {
  const owner = await currentOwner();
  return { loggedIn: owner !== null, owner };
});

export const getCurrentOwner = async (): Promise<Owner | null> => (await getViewer()).owner;
