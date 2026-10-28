"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPACES, SPACE_ORDER } from "@/lib/spaces";
import type { Space } from "@/lib/types";

const pill = "rounded-full px-2.5 py-2 text-sm whitespace-nowrap sm:px-4 sm:py-1.5";

/** El compartido es la portada pública; Cris y Melck se ven en /ver/*; la edición vive en /editar/*. */
const viewHref = (s: Space) => (s === "shared" ? "/" : `/ver/${s}`);
const editHref = (s: Space) => `/editar/${s}`;

/** Pestañas de los tres tableros, en modo lectura o edición según la ruta. */
export function SpaceNav() {
  const pathname = usePathname();
  const editing = pathname.startsWith("/editar");
  return (
    <nav className="flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-md">
      {SPACE_ORDER.map((s) => {
        const href = editing ? editHref(s) : viewHref(s);
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
    </nav>
  );
}
