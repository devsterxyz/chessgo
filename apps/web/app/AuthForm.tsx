"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3012";

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
      localStorage.setItem("chessgo_access_token", data.accessToken);
      localStorage.setItem("chessgo_refresh_token", data.refreshToken);
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
      localStorage.setItem("chessgo_access_token", data.accessToken);
      localStorage.setItem("chessgo_refresh_token", data.refreshToken);
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
      className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-200/70"
    >
      <div className="grid grid-cols-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
        <button
          type="button"
          onClick={() => {
            setAuthMode("signin");
            setMessage("");
          }}
          className={`rounded px-4 py-2 text-sm font-semibold transition ${
            isSignIn
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-neutral-500 hover:text-neutral-950"
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
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-neutral-500 hover:text-neutral-950"
          }`}
        >
          Sign up
        </button>
      </div>

      <h2 className="mt-8 text-2xl font-extrabold text-neutral-950">
        {isSignIn ? "Welcome back" : "Create account"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        {isSignIn
          ? "Sign in with your ChessGo username and password."
          : "Choose a username and password to start playing."}
      </p>

      <label className="mt-6 block text-sm font-bold text-neutral-800">
        Username
        <input
          name="username"
          type="text"
          autoComplete="username"
          className="mt-2 w-full rounded-lg border border-neutral-200 bg-[#fbfaf7] px-3 py-3 text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          placeholder={isSignIn ? "Enter username" : "Choose username"}
          required
        />
      </label>
      <label className="mt-4 block text-sm font-bold text-neutral-800">
        Password
        <input
          name="password"
          type="password"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          className="mt-2 w-full rounded-lg border border-neutral-200 bg-[#fbfaf7] px-3 py-3 text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          placeholder={isSignIn ? "Enter password" : "Choose password"}
          required
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting || isCreatingGuest}
        className="mt-6 h-12 w-full rounded-xl bg-emerald-600 px-4 font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none"
      >
        {isSubmitting ? "Please wait..." : isSignIn ? "Sign in" : "Sign up"}
      </button>

      <button
        type="button"
        onClick={handleGuestPlay}
        disabled={isSubmitting || isCreatingGuest}
        className="mt-3 block h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-center font-bold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
      >
        {isCreatingGuest ? "Creating guest..." : "Play as guest"}
      </button>

      {message ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}
