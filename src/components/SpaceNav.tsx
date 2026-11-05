"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPACES, SPACE_ORDER } from "@/lib/spaces";
import type { Space } from "@/lib/types";

/** El compartido es la portada pública; Cris y Melck se ven en /ver/*; la edición vive en /editar/*. */
const viewHref = (s: Space) => (s === "shared" ? "/" : `/ver/${s}`);
const editHref = (s: Space) => `/editar/${s}`;

/** Pestañas de papel de los tres tableros, en modo lectura o edición según la ruta. */
export function SpaceNav() {
  const pathname = usePathname();
  const editing = pathname.startsWith("/editar");
  return (
    <nav className="tabs">
      {SPACE_ORDER.map((s) => {
        const href = editing ? editHref(s) : viewHref(s);
        const active = pathname === href;
        return (
          <Link
            key={s}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`tab${active ? ` on ${SPACES[s].tab}` : ""}`}
          >
            {SPACES[s].short}
          </Link>
        );
      })}
    </nav>
  );
}
