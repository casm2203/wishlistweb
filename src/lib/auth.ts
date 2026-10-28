import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Owner } from "@/lib/types";

/** Quién mira la página: sin sesión (visitante de /ver), o con sesión y su dueño (null si no tiene perfil). */
export const getViewer = cache(async (): Promise<{ loggedIn: boolean; owner: Owner | null }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { loggedIn: false, owner: null };
  const { data } = await supabase.from("profiles").select("owner").eq("user_id", user.id).maybeSingle();
  return { loggedIn: true, owner: (data?.owner as Owner | undefined) ?? null };
});

export const getCurrentOwner = async (): Promise<Owner | null> => (await getViewer()).owner;
