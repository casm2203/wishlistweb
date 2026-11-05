"use client";

import { createContext, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { WORLD_W } from "./placement";

/** Zoom con el que el corcho se ve a tamaño real; en pantallas angostas no baja de MIN_K y se desliza en horizontal. */
const MIN_K = 0.6;
const MAX_K = 2.5;

/** Escala actual del corcho: las tarjetas la usan para convertir píxeles de pantalla en coordenadas del tablero. */
export const ScaleContext = createContext<() => number>(() => 1);

export interface StageApi {
  /** Pasa un punto de la pantalla a coordenadas del tablero. */
  toWorld(clientX: number, clientY: number): { x: number; y: number };
}

/** Corcho de ancho lógico fijo (WORLD_W) escalado para encajar en la página; crece hacia abajo con las tarjetas. */
export function BoardStage({ height, children, controlRef, zoom = 1 }: { height: number; children: ReactNode; controlRef?: Ref<StageApi>; zoom?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const k = useRef(1);
  const heightRef = useRef(height);
  const updateRef = useRef<() => void>(() => {});
  useEffect(() => {
    heightRef.current = height;
  });
  const zoomRef = useRef(zoom);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current!;
    // Escritorio: el corcho tiene alto fijo y todo se escala para caber sin scroll. Móvil: ancho mínimo y scroll.
    const fit = window.matchMedia("(min-width: 761px)");
    const update = () => {
      let next = Math.min(MAX_K, Math.max(MIN_K, root.clientWidth / WORLD_W));
      if (fit.matches && root.clientHeight > 0) {
        next = Math.min(root.clientWidth / WORLD_W, root.clientHeight / heightRef.current, MAX_K);
      }
      // Con zoom del usuario no se vuelve a encajar por alto (evita un bucle): ancho del corcho × zoom.
      if (zoomRef.current !== 1) next = Math.min(MAX_K * 1.6, Math.max(0.25, (root.clientWidth / WORLD_W) * zoomRef.current));
      k.current = next;
      setScale(next);
    };
    updateRef.current = update;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    fit.addEventListener("change", update);
    return () => {
      ro.disconnect();
      fit.removeEventListener("change", update);
    };
  }, [height]);

  useLayoutEffect(() => {
    zoomRef.current = zoom;
    updateRef.current();
  }, [zoom]);

  const getScale = useCallback(() => k.current, []);

  useImperativeHandle(controlRef, () => ({
    toWorld(cx, cy) {
      const r = innerRef.current!.getBoundingClientRect();
      return { x: (cx - r.left) / k.current, y: (cy - r.top) / k.current };
    },
  }));
  const s = scale ?? 1;

  return (
    <ScaleContext.Provider value={getScale}>
      <div ref={rootRef} className="zones" style={{ visibility: scale === null ? "hidden" : "visible" }}>
        <div ref={innerRef} style={{ position: "relative", width: WORLD_W * s, height: height * s, margin: "0 auto" }}>
          <div className="world" style={{ width: WORLD_W, height, transform: `scale(${s})` }}>
            {children}
          </div>
        </div>
      </div>
    </ScaleContext.Provider>
  );
}
