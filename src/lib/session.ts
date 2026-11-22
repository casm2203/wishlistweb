import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Owner } from "@/lib/types";

/** Nombre de la cookie de sesión y duración (30 días). */
export const SESSION_COOKIE = "wl_session";
const MAX_AGE = 60 * 60 * 24 * 30;

/** Clave HMAC desde SESSION_SECRET (mínimo 32 caracteres); falla si no está configurada. */
function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres)");
  return new TextEncoder().encode(secret);
}

/**
 * Lee y valida un token de sesión.
 * @param token Valor de la cookie.
 * @returns El dueño ('cris' | 'melck') o null si falta, expiró o fue alterado.
 */
export async function verifySession(token: string | undefined): Promise<Owner | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.owner === "cris" || payload.owner === "melck" ? payload.owner : null;
  } catch {
    return null;
  }
}

/** Crea la cookie de sesión firmada para `owner` (solo desde server actions / route handlers). */
export async function startSession(owner: Owner) {
  const token = await new SignJWT({ owner })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Borra la cookie de sesión. */
export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Dueño de la sesión actual (null si no hay sesión válida). Solo en contexto de petición. */
export async function currentOwner(): Promise<Owner | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
