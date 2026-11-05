import { Suspense } from "react";
import { BoardMenu } from "@/components/BoardMenu";
import { SpaceNav } from "@/components/SpaceNav";
import { getViewer } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

async function Shell({ children }: { children: React.ReactNode }) {
  const { loggedIn, owner } = await getViewer();

  if (loggedIn && !owner) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-sm text-stone-700">
          Tu cuenta todavía no está asignada a Cris o Melck. Agrégala en la tabla <code>profiles</code> de Supabase.
        </p>
        <form action={signOut}>
          <button className="rounded bg-stone-900 px-4 py-2 text-sm text-white">Salir</button>
        </form>
      </main>
    );
  }

  return (
    <>
      <div className="frame">
        <div className="board">
          <div className="lace" />
          <header className="top">
            <SpaceNav />
            <BoardMenu loggedIn={loggedIn} owner={owner} />
          </header>
          {children}
        </div>
      </div>
    </>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
