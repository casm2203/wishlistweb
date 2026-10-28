import { notFound, redirect } from "next/navigation";
import { SpaceBoard } from "@/features/board/SpaceBoard";
import { SPACE_ORDER } from "@/lib/spaces";
import type { Space } from "@/lib/types";

/** Vista pública de solo lectura de los tableros de Cris y Melck (el compartido es la portada). */
export default async function ViewSpacePage({ params }: PageProps<"/ver/[space]">) {
  const { space } = await params;
  if (!SPACE_ORDER.includes(space as Space)) notFound();
  if (space === "shared") redirect("/");
  return <SpaceBoard space={space as Space} readOnly />;
}
