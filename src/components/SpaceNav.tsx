"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPACES, SPACE_ORDER } from "@/lib/spaces";

const pill = "rounded-full px-2.5 py-2 text-sm whitespace-nowrap sm:px-4 sm:py-1.5";

/** Pestañas de los tres tableros. En /ver/* apuntan a la vista de solo lectura. */
export function SpaceNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const readOnly = pathname.startsWith("/ver");
  return (
    <nav className="flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-md">
      {SPACE_ORDER.map((s) => {
        const href = readOnly ? `/ver/${s}` : SPACES[s].href;
        const active = pathname === href;
        return (
          <Link
            key={s}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${pill} ${active ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-200"}`}
          >
            <span className="sm:hidden">{SPACES[s].short}</span>
            <span className="hidden sm:inline">{SPACES[s].label}</span>
          </Link>
        );
      })}
      {loggedIn && (
        <>
          <span className="mx-0.5 h-5 w-px bg-stone-300" aria-hidden />
          <Link
            href={readOnly ? "/" : "/ver/shared"}
            className={`${pill} ${readOnly ? "bg-amber-200 text-amber-950" : "text-stone-600 hover:bg-stone-200"}`}
            title={readOnly ? "Volver a editar" : "Ver cualquier tablero sin poder editar"}
          >
            <span aria-hidden>👁</span>
            <span className="hidden sm:inline"> {readOnly ? "Solo lectura · Editar" : "Solo ver"}</span>
            <span className="sr-only sm:hidden">{readOnly ? "Solo lectura, volver a editar" : "Solo ver"}</span>
          </Link>
        </>
      )}
    </nav>
  );
}
