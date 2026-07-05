"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { closeGameSocket } from "./lib/gameSocket";

type StoredUser = {
  username?: string;
};

export function Navbar() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [username, setUsername] = useState("Player");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("chessgo_user");

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser) as StoredUser;
      setUsername(user.username?.trim() || "Player");
    } catch {
      setUsername("Player");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    closeGameSocket();
    localStorage.removeItem("chessgo_user");
    localStorage.removeItem("chessgo_access_token");
    localStorage.removeItem("chessgo_refresh_token");
    setIsProfileOpen(false);
    router.replace("/");
  };

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950 px-4 text-white">
      <div className="mx-auto flex h-16 max-w-screen-lg items-center justify-between">
        <Link href="/play" onClick={closeGameSocket}>
          <h1 className="text-xl font-bold">ChessGo</h1>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold transition hover:border-emerald-400 hover:text-emerald-300"
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
          >
            Profile
          </button>

          {isProfileOpen ? (
            <div
              className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-neutral-800 bg-neutral-900 p-3 shadow-xl"
              role="menu"
            >
              <p className="truncate text-sm font-medium text-neutral-100">
                {username}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 w-full rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                role="menuitem"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
