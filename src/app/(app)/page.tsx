import { Suspense } from "react";
import { SpaceBoard } from "@/features/board/SpaceBoard";

/** Inicio: vista pública de solo lectura del tablero compartido. */
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <SpaceBoard space="shared" readOnly />
    </Suspense>
  );
}
