import { SPACES } from "@/lib/spaces";
import type { Space } from "@/lib/types";
import { BANNER } from "./placement";

/** Letrero decorativo con el nombre del espacio. No intercepta el puntero (el tablero se puede mover por encima). */
export function Banner({ space }: { space: Space }) {
  const { title, banner } = SPACES[space];
  return (
    <div
      className="pointer-events-none absolute select-none"
      style={{ left: BANNER.x, top: BANNER.y, width: BANNER.w, height: BANNER.h, filter: "drop-shadow(0 6px 5px rgba(40,22,5,0.4))" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- recorte local WebP, no se reencodea */}
      <img src={banner} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-[14%] bottom-[16%] top-[22%] flex items-center justify-center">
        <h1 className="font-hand text-[112px] font-bold leading-none text-[#5a3b25]">{title}</h1>
      </div>
    </div>
  );
}
