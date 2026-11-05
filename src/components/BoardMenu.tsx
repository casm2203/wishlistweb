"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import type { Owner } from "@/lib/types";

/** Aviso al tablero abierto para que acomode sus tarjetas en filas (lo escucha BoardClient). */
export const ARRANGE_EVENT = "board:arrange";

/** Menú hamburguesa de papel (arriba a la derecha): modo de vista, acomodar tarjetas y salir. */
export function BoardMenu({ loggedIn, owner }: { loggedIn: boolean; owner: Owner | null }) {
  const pathname = usePathname();
  const editing = pathname.startsWith("/editar");
  const [openPath, setOpenPath] = useState<string | null>(null);
  // Abierto solo en la ruta donde se abrió: al navegar se cierra solo.
  const open = openPath === pathname;
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpenPath(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpenPath(null);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const close = () => setOpenPath(null);

  return (
    <div className="menu" ref={box}>
      <button
        type="button"
        className="menu-btn"
        aria-label="Menú"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenPath(open ? null : pathname)}
      >
        ☰
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <div className="menu-paper">
            {editing ? (
              <>
                <Link href="/" className="menu-item" role="menuitem" onClick={close}>
                  <span className="ic">👁</span> Ver como visitante
                </Link>
                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    close();
                    window.dispatchEvent(new Event(ARRANGE_EVENT));
                  }}
                >
                  <span className="ic">▦</span> Acomodar tarjetas
                </button>
              </>
            ) : loggedIn ? (
              <Link href={`/editar/${owner ?? "shared"}`} className="menu-item" role="menuitem" onClick={close}>
                <span className="ic">✏️</span> Editar mi tablero
              </Link>
            ) : (
              <Link href="/login" className="menu-item" role="menuitem" onClick={close}>
                <span className="ic">🔑</span> Iniciar sesión para editar
              </Link>
            )}
            {loggedIn && (
              <form action={signOut}>
                <button type="submit" className="menu-item" role="menuitem">
                  <span className="ic">↪</span> Salir ({owner === "cris" ? "Cris" : "Melck"})
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
