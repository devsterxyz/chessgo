"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@repo/ui/Button";

const API_BASE_URL = "http://localhost:3000";

export default function Home() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignIn = authMode === "signin";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const endpoint = isSignIn ? "/user/signIn" : "/user/register";

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? "Something went wrong");
        return;
      }

      localStorage.setItem("chessgo_user", JSON.stringify(data.user));
      router.push("/play");
    } catch {
      setMessage("Could not connect to the backend server");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="grid grid-cols-2 rounded-md border border-neutral-800 bg-neutral-950 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setMessage("");
                }}
                className={`rounded px-4 py-2 text-sm font-semibold transition ${
                  isSignIn
                    ? "bg-emerald-500 text-neutral-950"
                    : "text-neutral-300 hover:text-white"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setMessage("");
                }}
                className={`rounded px-4 py-2 text-sm font-semibold transition ${
                  !isSignIn
                    ? "bg-emerald-500 text-neutral-950"
                    : "text-neutral-300 hover:text-white"
                }`}
              >
                Sign up
              </button>
            </div>

            <h2 className="mt-8 text-2xl font-semibold">
              {isSignIn ? "Welcome back" : "Create account"}
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              {isSignIn
                ? "Sign in with your ChessGo username and password."
                : "Choose a username and password to start playing."}
            </p>

            <label className="mt-6 block text-sm font-medium text-neutral-200">
              Username
              <input
                name="username"
                type="text"
                autoComplete="username"
                className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-emerald-400"
                placeholder={isSignIn ? "Enter username" : "Choose username"}
                required
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-neutral-200">
              Password
              <input
                name="password"
                type="password"
                autoComplete={isSignIn ? "current-password" : "new-password"}
                className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-emerald-400"
                placeholder={isSignIn ? "Enter password" : "Choose password"}
                required
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-600 disabled:text-neutral-300"
            >
              {isSubmitting ? "Please wait..." : isSignIn ? "Sign in" : "Sign up"}
            </button>

            {message ? (
              <p className="mt-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
                {message}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}
