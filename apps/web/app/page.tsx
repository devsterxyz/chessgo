"use client";

import Image from "next/image";
import { AuthForm } from "./AuthForm";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

function subscribeToStoredUser(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function hasStoredUser() {
  return Boolean(localStorage.getItem("chessgo_user"));
}

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useSyncExternalStore(
    subscribeToStoredUser,
    hasStoredUser,
    () => false,
  );

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/play");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f7f5f0] px-3 py-3 text-neutral-950 lg:px-5">
      <div className="mx-auto grid h-full max-w-[1180px] gap-3 overflow-hidden lg:grid-cols-[1fr_390px] lg:gap-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-100 px-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-neutral-100 text-center text-2xl leading-9 text-neutral-500">
                ♟
              </div>
              <div>
                <p className="text-sm font-bold">ChessGo</p>
                <p className="text-xs text-neutral-500">
                  Ready for your next game
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-100 px-4 py-1.5 font-mono text-xl font-bold tabular-nums text-neutral-600">
              5:00
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center bg-[#fbfaf7] px-3 py-3">
            <Image
              src="/chessBoard.png"
              alt="Chess board"
              width={560}
              height={560}
              priority
              className="aspect-square h-full max-h-full w-auto max-w-full rounded-xl border border-neutral-200 bg-neutral-100 object-cover shadow-2xl shadow-neutral-300/60"
            />
          </div>

          <div className="flex h-14 shrink-0 items-center justify-between border-t border-neutral-100 px-4">
            <div>
              <p className="text-sm font-bold">You</p>
              <p className="text-xs text-neutral-500">Sign in to start</p>
            </div>
            <div className="rounded-lg bg-neutral-900 px-4 py-1.5 font-mono text-xl font-bold tabular-nums text-white">
              5:00
            </div>
          </div>
        </section>

        <section className="flex min-h-0 w-full flex-col justify-center overflow-hidden">
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
