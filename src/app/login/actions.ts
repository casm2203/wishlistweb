"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/session";

/**
 * Login por nombre: el visitante escribe "cris" o "melck" y se crea una cookie de sesión firmada.
 * @returns Mensaje de error, o redirige al tablero del dueño.
 */
export async function signIn(_: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();
  if (name !== "cris" && name !== "melck") return "Escribe cris o melck";
  try {
    await startSession(name);
  } catch {
    return "Falta configurar la sesión en el servidor";
  }
  redirect(`/editar/${name}`);
}

/** Cierra la sesión y vuelve a la portada. */
export async function signOut() {
  await endSession();
  redirect("/");
}
