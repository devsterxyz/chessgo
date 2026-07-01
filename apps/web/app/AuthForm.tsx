"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

const API_BASE_URL = "http://localhost:3000";

export function AuthForm() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
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

  const handleGuestPlay = async () => {
    setMessage("");
    setIsCreatingGuest(true);

    try {
      const response = await fetch(`${API_BASE_URL}/user/guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? "Could not create guest user");
        return;
      }

      localStorage.setItem("chessgo_user", JSON.stringify(data.user));
      router.push("/play");
    } catch {
      setMessage("Could not connect to the backend server");
    } finally {
      setIsCreatingGuest(false);
    }
  };

  return (
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
        disabled={isSubmitting || isCreatingGuest}
        className="mt-6 w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-600 disabled:text-neutral-300"
      >
        {isSubmitting ? "Please wait..." : isSignIn ? "Sign in" : "Sign up"}
      </button>

      <button
        type="button"
        onClick={handleGuestPlay}
        disabled={isSubmitting || isCreatingGuest}
        className="mt-3 block w-full rounded-md border border-neutral-700 px-4 py-2 text-center font-semibold text-neutral-100 transition hover:border-emerald-400 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-500"
      >
        {isCreatingGuest ? "Creating guest..." : "Play as guest"}
      </button>

      {message ? (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
          {message}
        </p>
      ) : null}
    </form>
  );
}
