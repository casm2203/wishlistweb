"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_: string | null, formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return "Correo o contraseña incorrectos";
  // Directo a su propio tablero (si la cuenta aún no tiene perfil, al compartido).
  const { data: profile } = await supabase.from("profiles").select("owner").eq("user_id", data.user.id).maybeSingle();
  redirect(`/editar/${profile?.owner ?? "shared"}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
