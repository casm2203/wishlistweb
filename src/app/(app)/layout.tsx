import { Suspense } from "react";
import { BoardMenu } from "@/components/BoardMenu";
import { SpaceNav } from "@/components/SpaceNav";
import { getViewer } from "@/lib/auth";

async function Shell({ children }: { children: React.ReactNode }) {
  const { loggedIn, owner } = await getViewer();

  return (
    <>
      <div className="page">
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
