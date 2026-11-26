import Link from "next/link";
import { signOut } from "@/app/login/actions";
import type { Owner } from "@/lib/types";

/** Cinta de la esquina superior derecha: ✕ para salir con sesión; llave para entrar sin ella. */
export function CornerButton({ loggedIn, owner }: { loggedIn: boolean; owner: Owner | null }) {
  if (!loggedIn)
    return (
      <Link href="/login" className="corner" title="Iniciar sesión para editar" aria-label="Iniciar sesión para editar">
        🔑
      </Link>
    );
  const label = `Salir (${owner === "cris" ? "Cris" : "Melck"})`;
  return (
    <form action={signOut}>
      <button type="submit" className="corner" title={label} aria-label={label}>
        ✕
      </button>
    </form>
  );
}
