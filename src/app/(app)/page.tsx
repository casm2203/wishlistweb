import { SpaceBoard } from "@/features/board/SpaceBoard";

/** Inicio: vista pública de solo lectura del tablero compartido. */
export default function HomePage() {
  return <SpaceBoard space="shared" readOnly />;
}
