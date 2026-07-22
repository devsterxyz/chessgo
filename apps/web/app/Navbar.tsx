"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { closeGameSocket } from "./lib/gameSocket";

type StoredUser = {
  username?: string;
};

function subscribeToStoredUser(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getStoredUsername() {
  const storedUser = localStorage.getItem("chessgo_user");

  if (!storedUser) {
    return "Player";
  }

  try {
    const user = JSON.parse(storedUser) as StoredUser;
    return user.username?.trim() || "Player";
  } catch {
    return "Player";
  }
}

export function Navbar() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const username = useSyncExternalStore(
    subscribeToStoredUser,
    getStoredUsername,
    () => "Player",
  );
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
    <nav className="border-b border-neutral-200 bg-white px-4 text-neutral-950 shadow-sm shadow-neutral-200/60">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between">
        <Link href="/play" onClick={closeGameSocket}>
          <h1 className="text-xl font-extrabold">ChessGo</h1>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
          >
            Profile
          </button>

          {isProfileOpen ? (
            <div
              className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl shadow-neutral-200/70"
              role="menu"
            >
              <p className="truncate text-sm font-bold text-neutral-950">
                {username}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100"
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
