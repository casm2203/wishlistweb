import type { ReactNode } from "react";

/** Hoja de cuaderno: a la izquierda la tarjeta, a la derecha el contenido sobre papel rayado. */
export function Sheet({ preview, onClose, children }: { preview: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet">
      <button type="button" className="x" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
      <div className="left">
        <div className="preview">{preview}</div>
      </div>
      <div className="right">{children}</div>
    </div>
  );
}
