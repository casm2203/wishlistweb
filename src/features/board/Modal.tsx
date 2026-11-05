"use client";

import { useEffect, type ReactNode } from "react";

/** Telón oscuro que centra su contenido (una hoja) sobre el tablero. */
export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="veil"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}
