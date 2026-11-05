"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CATEGORIES, CATEGORY_ORDER, HOLDERS, INKS, PIN_COLORS, STYLES, holderOf, styleOf } from "@/lib/spaces";
import type { CardStyle, HolderKind, Item, ItemCategory } from "@/lib/types";
import { Card, Clip } from "./cards";
import { Swatches } from "./Swatches";

type Holder = Exclude<HolderKind, "none">;

interface Props {
  /** Paso 1: elegir tarjeta. Paso 2: pegarla (`tmp` es la tarjeta provisional del corcho). */
  tmp: Item | null;
  /** Suelta una tarjeta del catálogo: en (x, y) de pantalla, o sin coordenadas si solo se tocó. */
  onPlace: (category: ItemCategory, style: CardStyle, x?: number, y?: number) => void;
  onHolder: (holder: Holder) => void;
  onPatch: (patch: Partial<Pick<Item, "holder_color" | "paper" | "ink">>) => void;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

const TILTS = [-8, 5, -3, 9, -6, 4, -10, 7, -2, 6];
const LIFTS = [6, -8, 10, -4, 2, -10, 8, -2, 4, -6];
const HOLDER_ORDER: Holder[] = ["pin", "tape", "clip"];
const NO_INK: CardStyle[] = ["estampilla", "pelicula"];

const SAMPLE_BG: Partial<Record<ItemCategory, string>> = { articulo: "#e9e4da", cine: "#6b5a52" };

/** Tarjeta vacía de muestra para el catálogo. */
function sampleItem(category: ItemCategory, style: CardStyle): Item {
  return {
    id: `sample-${style}`,
    space: "shared",
    category,
    name: "",
    description: "",
    price: null,
    currency: "COP",
    url: null,
    image_url: null,
    needs_locker: false,
    kind: "want",
    status: "pending",
    x: 0,
    y: 0,
    rotation: 0,
    style,
    paper: null,
    ink: null,
    holder: "none",
    holder_color: null,
    bg: SAMPLE_BG[category] ?? null,
    emoji: "",
    code: null,
    scale: 1,
    z: 1,
    created_by: null,
    created_at: "",
    updated_at: "",
  };
}

function HolderObject({ kind }: { kind: Holder }) {
  if (kind === "pin")
    return (
      <div className="fpin">
        <div className="pp" style={{ "--c": PIN_COLORS[0] } as React.CSSProperties} />
      </div>
    );
  if (kind === "tape")
    return (
      <div className="ftape">
        <div className="tape" style={{ "--tp": "#f6c9d3" } as React.CSSProperties} />
      </div>
    );
  return (
    <div className="fclip">
      <Clip color="#9fa3a9" />
    </div>
  );
}

/** Bandeja inferior: se arrastra una tarjeta al corcho, luego se le pone el sujetador y los colores. */
export function Tray({ tmp, onPlace, onHolder, onPatch, onBack, onNext, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [ghost, setGhost] = useState<{ node: ReactNode; x: number; y: number } | null>(null);

  // Entra deslizándose y oculta los botones flotantes mientras está abierta.
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    document.body.classList.add("traying");
    return () => {
      cancelAnimationFrame(id);
      document.body.classList.remove("traying");
    };
  }, []);

  /** Arrastra una copia bajo el puntero; al soltar fuera de la bandeja llama a `onDrop` con la posición (o sin ella si solo fue un toque). */
  function startDrag(e: React.PointerEvent, node: ReactNode, onDrop: (x?: number, y?: number) => void) {
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    setGhost({ node, x: sx, y: sy });
    const move = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
      setGhost({ node, x: ev.clientX, y: ev.clientY });
    };
    const noScroll = (ev: TouchEvent) => ev.preventDefault();
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("touchmove", noScroll);
      setGhost(null);
      const r = ref.current!.getBoundingClientRect();
      const inTray = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      if (moved && !inTray) onDrop(ev.clientX, ev.clientY);
      else if (!moved) onDrop();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("touchmove", noScroll, { passive: false });
  }

  const choosing = tmp === null;
  const holder = tmp ? holderOf(tmp) : null;
  const hasHolder = !!tmp?.holder && tmp.holder !== "none";
  const style = tmp ? styleOf(tmp) : null;

  return (
    <>
      <div ref={ref} className={`tray s1${on ? " on" : ""}`}>
        <div className="thd">
          <span className="t">
            {choosing
              ? "arrastra lo que quieras al tablero ✿"
              : hasHolder
                ? "¿de qué color?"
                : "¿con qué lo pegas? arrástralo encima ✿"}
          </span>
          <button type="button" className="x2" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {choosing ? (
          <div className="tstrip">
            {CATEGORY_ORDER.flatMap((c) => CATEGORIES[c].styles.map((st) => [c, st] as const)).map(([c, st], n) => (
              <button
                key={st}
                type="button"
                aria-label={STYLES[st].label}
                title={STYLES[st].label}
                className="tthumb"
                style={{ "--tr": `${TILTS[n % 10]}deg`, "--ty": `${LIFTS[n % 10]}px` } as React.CSSProperties}
                onPointerDown={(e) => startDrag(e, <Card item={sampleItem(c, st)} />, (x, y) => onPlace(c, st, x, y))}
              >
                <div className="tbox">
                  <div className="tin">
                    <Card item={sampleItem(c, st)} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="fstrip">
              {HOLDER_ORDER.map((h, n) => (
                <button
                  key={h}
                  type="button"
                  aria-label={HOLDERS[h].label}
                  className={`fbtn${tmp.holder === h ? " on" : ""}`}
                  style={{ "--tr": `${[-10, 6, -4][n]}deg` } as React.CSSProperties}
                  onPointerDown={(e) => startDrag(e, <HolderObject kind={h} />, () => onHolder(h))}
                >
                  <HolderObject kind={h} />
                </button>
              ))}
            </div>
            {hasHolder && holder && holder.kind !== "none" && style && (
              <div className="tf">
                <div className="crow">
                  <span>{holder.kind === "pin" ? "pin" : holder.kind === "tape" ? "cinta" : "clip"}</span>
                  <Swatches
                    colors={HOLDERS[holder.kind].colors}
                    value={holder.color}
                    onPick={(c) => onPatch({ holder_color: c })}
                  />
                </div>
                <div className="crow">
                  <span>fondo</span>
                  <Swatches
                    colors={STYLES[style].papers}
                    value={tmp.paper ?? STYLES[style].papers[0]}
                    onPick={(c) => onPatch({ paper: c })}
                  />
                </div>
                {!NO_INK.includes(style) && (
                  <div className="crow">
                    <span>letra</span>
                    <Swatches colors={INKS} value={tmp.ink} onPick={(c) => onPatch({ ink: c })} />
                  </div>
                )}
              </div>
            )}
            <div className="tacts">
              <button type="button" className="btn soft" onClick={onBack}>
                ← otro
              </button>
              {hasHolder && (
                <button type="button" className="btn pinkb" onClick={onNext}>
                  listo, ponerle los datos →
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {ghost && (
        <div className="ghost" style={{ left: ghost.x, top: ghost.y }}>
          {ghost.node}
        </div>
      )}
    </>
  );
}
