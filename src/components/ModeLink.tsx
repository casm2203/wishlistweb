"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Owner } from "@/lib/types";

const base = "pointer-events-auto rounded-full px-4 py-2.5 text-sm shadow-lg whitespace-nowrap";

/** Botón inferior: en la vista pública lleva al login (o a editar si ya hay sesión); editando, vuelve a la vista pública. */
export function ModeLink({ loggedIn, owner }: { loggedIn: boolean; owner: Owner | null }) {
  const editing = usePathname().startsWith("/editar");
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-20">
      {editing ? (
        <Link href="/" className={`${base} bg-white/90 text-stone-800 hover:bg-white`}>
          👁 Ver como visitante
        </Link>
      ) : loggedIn ? (
        <Link href={`/editar/${owner ?? "shared"}`} className={`${base} bg-stone-900 text-white hover:bg-stone-700`}>
          ✏️ Editar mi tablero
        </Link>
      ) : (
        <Link href="/login" className={`${base} bg-stone-900 text-white hover:bg-stone-700`}>
          🔑 Iniciar sesión para editar
        </Link>
      )}
    </div>
  );
}
