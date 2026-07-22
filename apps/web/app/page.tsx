"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@repo/ui/Button";
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
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-neutral-950 lg:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1180px] gap-6 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70">
          <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-neutral-100 text-center text-3xl leading-10 text-neutral-500">
                ♟
              </div>
              <div>
                <p className="text-sm font-bold">ChessGo</p>
                <p className="text-xs text-neutral-500">
                  Ready for your next game
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-100 px-5 py-2 font-mono text-xl font-bold tabular-nums text-neutral-600">
              5:00
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center bg-[#fbfaf7] px-4 py-8">
            <Image
              src="/chessBoard.png"
              alt="Chess board"
              width={560}
              height={560}
              priority
              className="aspect-square w-full max-w-[560px] rounded-xl border border-neutral-200 bg-neutral-100 object-cover shadow-2xl shadow-neutral-300/60"
            />
          </div>

          <div className="flex h-16 items-center justify-between border-t border-neutral-100 px-5">
            <div>
              <p className="text-sm font-bold">You</p>
              <p className="text-xs text-neutral-500">Sign in to start</p>
            </div>
            <div className="rounded-lg bg-neutral-900 px-5 py-2 font-mono text-xl font-bold tabular-nums text-white">
              5:00
            </div>
          </div>
        </section>

        <section className="flex w-full flex-col justify-center">
          <div className="mb-5 px-1">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
              New Game
            </p>
            <h1 className="mt-2 text-4xl font-extrabold text-neutral-950">
              Play ChessGo
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Sign in, create an account, or keep it quick with a guest game.
            </p>
            <div className="mt-5">
              <Link href="/play">
                <Button>Go to Play</Button>
              </Link>
            </div>
          </div>
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
