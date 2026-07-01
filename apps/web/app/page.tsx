import Link from "next/link";
import { Button } from "@repo/ui/Button";
import { AuthForm } from "./AuthForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <img
            src="/chessBoard.png"
            alt="Chess board"
            className="w-full max-w-80 rounded-lg"
          />
          <h1 className="mt-8 text-4xl font-bold">ChessGo</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-neutral-300">
            Sign in or create an account, then jump into a game.
          </p>
          <div className="mt-6">
            <Link href="/play">
              <Button>Play</Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
