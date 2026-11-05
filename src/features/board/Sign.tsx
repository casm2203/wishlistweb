import { SPACES } from "@/lib/spaces";
import type { Space } from "@/lib/types";

/** Letras recortadas disponibles (public/letras). Las que faltan se dibujan como papelitos en CSS. */
const IMG = new Set(["n", "U", "e", "S", "t", "R", "a", "W", "i", "s", "H", "l", "I", "T", "M", "L", "c", "K"]);
const file = (ch: string) => `/letras/${ch === ch.toUpperCase() ? "u" : "l"}_${ch.toLowerCase()}.webp`;

// Título de «carta de rescate» por espacio (palabras separadas por «|»).
const TITLES: Record<Space, string> = { cris: "Cris", shared: "nUeStRa|WisHlIsT", melck: "Melck" };
const PAPERS = ["#f4a3bf", "#fff3a6", "#a9d3e8", "#e3342f", "#a8dcc0", "#f6efe0"];

// Giro y desplazamiento fijos por posición (no aleatorios: evita diferencias servidor/cliente).
const ROT = [-6, 4, -3, 7, -5, 3, -4, 6, 2, -2];
const OFF = [0, 5, -4, 3, -2, 4, -3, 2, 0, -3];

function Letter({ ch, i }: { ch: string; i: number }) {
  const style = { "--r": `${ROT[i % ROT.length]}deg`, "--y": `${OFF[i % OFF.length]}px` } as React.CSSProperties;
  // «e» de Melck usa el otro recorte para que no se repita con el de «nuestra»
  const src = ch === "e" && i === 1 ? "/letras/l_e2.webp" : file(ch);
  if (IMG.has(ch)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={ch} style={style} />;
  }
  return (
    <span className="rl" style={{ ...style, background: PAPERS[(i + ch.charCodeAt(0)) % PAPERS.length] }}>
      {ch}
    </span>
  );
}

/** Palabras de «carta de rescate» (separadas por «|»). */
export function Ransom({ text, label, long }: { text: string; label: string; long?: boolean }) {
  const words = text.split("|");
  let i = 0;
  return (
    <div className={`ransom${long ?? words.length > 1 ? " long" : ""}`} role="heading" aria-level={1} aria-label={label}>
      <div className="rline" aria-hidden>
        {words.map((w, wi) => (
          <span className="rw" key={wi}>
            {[...w].map((ch) => (
              <Letter key={i} ch={ch} i={i++} />
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Título del espacio con letras recortadas, como carta de rescate. */
export function Sign({ space }: { space: Space }) {
  const { title, sub } = SPACES[space];
  return (
    <div className="signwrap">
      <Ransom text={TITLES[space]} label={title} />
      <small className="ransom-sub">{sub}</small>
    </div>
  );
}

export const WISHLIST_TITLE = TITLES.shared;
