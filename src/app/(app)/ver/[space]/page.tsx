import { notFound } from "next/navigation";
import { SpaceBoard } from "@/features/board/SpaceBoard";
import { SPACE_ORDER } from "@/lib/spaces";
import type { Space } from "@/lib/types";

/** Vista de solo lectura de cualquiera de los tres tableros. */
export default async function ViewSpacePage({ params }: PageProps<"/ver/[space]">) {
  const { space } = await params;
  if (!SPACE_ORDER.includes(space as Space)) notFound();
  return <SpaceBoard space={space as Space} readOnly />;
}
