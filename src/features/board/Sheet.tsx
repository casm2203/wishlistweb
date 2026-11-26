import type { CSSProperties, ReactNode } from "react";
import { CATEGORIES, paperOf, styleOf } from "@/lib/spaces";
import type { Item } from "@/lib/types";

interface Props {
  item: Pick<Item, "category" | "style" | "paper">;
  /** Columna izquierda (foto y enlace); las notas no la usan. */
  aside?: ReactNode;
  editing?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Hoja cuadriculada con cinta; una nota toma la forma y el color de su propio papel. */
export function PaperSheet({ item, aside, editing, onClose, children }: Props) {
  const isNote = item.category === "nota";
  const look = { ...item, id: "", ink: null, holder: null, holder_color: null, bg: null, emoji: null, scale: 1 };
  const cls = ["paper", editing && "ed", isNote && `asnote st-${styleOf(item)}`].filter(Boolean).join(" ");
  return (
    <div className={cls} style={isNote ? ({ "--np": paperOf(look) } as CSSProperties) : undefined}>
      <div className="ntape" />
      <button type="button" className="x" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
      <div className={`nbody${aside && !isNote ? "" : " one"}`}>
        {aside && !isNote && <div className="lcol">{aside}</div>}
        {children}
      </div>
    </div>
  );
}

export function CameraIcon() {
  return (
    <svg className="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/** Foto de la tarjeta; sin foto se ve su dibujo sobre el color de fondo. */
export function PhotoBox({ item }: { item: Pick<Item, "category" | "bg" | "emoji" | "image_url"> }) {
  const meta = CATEGORIES[item.category];
  if (item.category === "nota") return null;
  return (
    <div className="rawph" style={{ "--bg": item.bg ?? meta.bg } as CSSProperties}>
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto servida desde la base, sin reencodar
        <img src={item.image_url} alt="" />
      ) : (
        <span>{item.emoji || meta.emoji}</span>
      )}
    </div>
  );
}
