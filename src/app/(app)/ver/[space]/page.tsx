import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { SpaceBoard } from "@/features/board/SpaceBoard";
import { SPACE_ORDER } from "@/lib/spaces";
import type { Space } from "@/lib/types";

async function View({ params }: { params: PageProps<"/ver/[space]">["params"] }) {
  const { space } = await params;
  if (!SPACE_ORDER.includes(space as Space)) notFound();
  if (space === "shared") redirect("/");
  return <SpaceBoard space={space as Space} readOnly />;
}

/** Vista pública de solo lectura de los tableros de Cris y Melck (el compartido es la portada). */
export default function ViewSpacePage({ params }: PageProps<"/ver/[space]">) {
  return (
    <Suspense fallback={null}>
      <View params={params} />
    </Suspense>
  );
}
