import { Suspense } from "react";
import { SpaceNav } from "@/components/SpaceNav";
import Link from "next/link";
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
    <div className="relative h-dvh overflow-hidden">
      {children}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto">
          <SpaceNav loggedIn={loggedIn} />
        </div>
        {loggedIn ? (
          <form action={signOut} className="pointer-events-auto">
            <button className="rounded-full bg-white/90 px-3 py-2.5 text-sm text-stone-700 shadow-md sm:py-2 hover:bg-white">
              Salir<span className="hidden sm:inline"> ({owner === "cris" ? "Cris" : "Melck"})</span>
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="pointer-events-auto rounded-full bg-stone-900 px-3 py-2.5 text-sm text-white shadow-md sm:px-4 sm:py-2 hover:bg-stone-700"
          >
            Entrar<span className="hidden sm:inline"> · Iniciar sesión</span>
          </Link>
        )}
      </header>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#2a1c10]" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
