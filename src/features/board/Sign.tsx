import { SPACES } from "@/lib/spaces";
import type { Space } from "@/lib/types";

/** Letrero de madera con el nombre del espacio. */
export function Sign({ space }: { space: Space }) {
  const { title, sub } = SPACES[space];
  return (
    <div className="sign">
      <span className="bow">🎀</span>
      <h1>{title}</h1>
      <small>{sub}</small>
      <span className="flower">✿</span>
    </div>
  );
}
