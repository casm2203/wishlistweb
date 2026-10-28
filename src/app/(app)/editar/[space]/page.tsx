import { notFound } from "next/navigation";
import { SpaceBoard } from "@/features/board/SpaceBoard";
import { SPACE_ORDER } from "@/lib/spaces";
import type { Space } from "@/lib/types";

/** Tableros editables (requieren sesión; cada quien edita el suyo y el compartido). */
export default async function EditSpacePage({ params }: PageProps<"/editar/[space]">) {
  const { space } = await params;
  if (!SPACE_ORDER.includes(space as Space)) notFound();
  return <SpaceBoard space={space as Space} />;
}
