"use client";

import { useEffect, type ReactNode } from "react";

/** Tarjeta con forma de instantánea, centrada sobre el tablero. */
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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/45 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto w-full max-w-[380px] bg-[#fdfcf8] sm:-rotate-1 p-4 pb-5 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
