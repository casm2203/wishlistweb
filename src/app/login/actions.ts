"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Who = "cris" | "melck";

// Las credenciales viven solo en variables de entorno del servidor (nunca NEXT_PUBLIC_*).
// El visitante solo escribe "cris" o "melck": el servidor inicia sesión con la cuenta real.
function credentialsFor(who: Who) {
  const key = who.toUpperCase();
  const email = process.env[`LOGIN_${key}_EMAIL`];
  const password = process.env[`LOGIN_${key}_PASSWORD`];
  return email && password ? { email, password } : null;
}

export async function signIn(_: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();
  if (name !== "cris" && name !== "melck") return "Escribe cris o melck";

  const creds = credentialsFor(name);
  if (!creds) return "Falta configurar el acceso de esta cuenta en el servidor";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(creds);
  if (error) return "No se pudo entrar. Revisa la configuración del acceso";

  // Directo a su propio tablero (si la cuenta aún no tiene perfil, al compartido).
  const { data: profile } = await supabase.from("profiles").select("owner").eq("user_id", data.user.id).maybeSingle();
  redirect(`/editar/${profile?.owner ?? "shared"}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
