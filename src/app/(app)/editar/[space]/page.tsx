import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SpaceBoard } from "@/features/board/SpaceBoard";
import { SPACE_ORDER } from "@/lib/spaces";
import type { Space } from "@/lib/types";

async function Edit({ params }: { params: PageProps<"/editar/[space]">["params"] }) {
  const { space } = await params;
  if (!SPACE_ORDER.includes(space as Space)) notFound();
  return <SpaceBoard space={space as Space} />;
}

/** Tableros editables (requieren sesión; cada quien edita el suyo y el compartido). */
export default function EditSpacePage({ params }: PageProps<"/editar/[space]">) {
  return (
    <Suspense fallback={null}>
      <Edit params={params} />
    </Suspense>
  );
}
