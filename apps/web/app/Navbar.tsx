"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { closeGameSocket } from "./lib/gameSocket";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

type StoredUser = {
  username?: string;
};

type ProfileInfo = {
  username: string;
  bio: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  joinedDate: string;
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

function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "CG";
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
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const hasFetchedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (hasFetchedRef.current && profileInfo) return;

    const token = localStorage.getItem("chessgo_access_token");
    if (!token) {
      setProfileError("Not signed in");
      return;
    }

    setIsLoadingProfile(true);
    setProfileError("");

    try {
      const res = await fetch(`${API_BASE_URL}/user/getProfile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || !data.user) {
        setProfileError(data.message ?? "Failed to load profile");
        return;
      }

      const user = data.user;

      setProfileInfo({
        username: user.username ?? username,
        bio: user.bio ?? "No bio yet.",
        wins: user.wins ?? 0,
        losses: user.losses ?? 0,
        gamesPlayed: user.gamesPlayed ?? 0,
        joinedDate:
          user.joinedDate ??
          (user.createdAt
            ? new Date(user.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Unknown"),
      });
      hasFetchedRef.current = true;
    } catch {
      setProfileError("Could not connect to server");
    } finally {
      setIsLoadingProfile(false);
    }
  }, [profileInfo, username]);

  useEffect(() => {
    if (isProfileOpen) {
      fetchProfile();
    }
  }, [isProfileOpen, fetchProfile]);

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
    setProfileInfo(null);
    hasFetchedRef.current = false;
    router.replace("/");
  };

  const displayName = profileInfo?.username ?? username;
  const initials = getInitials(displayName);

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
            className="flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-bold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-950 text-[10px] font-extrabold text-white">
              {initials}
            </span>
            {displayName}
          </button>

          {isProfileOpen ? (
            <div
              className="absolute right-0 z-10 mt-2 w-72 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70"
              role="menu"
              style={{
                animation: "navDropdownIn 0.15s ease-out",
              }}
            >
              <div className="border-b border-neutral-100 bg-gradient-to-br from-neutral-50 to-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-lg font-extrabold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-neutral-950">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      @{displayName}
                    </p>
                  </div>
                </div>

                {isLoadingProfile ? (
                  <p className="mt-3 text-xs font-medium text-neutral-400">
                    Loading profile...
                  </p>
                ) : profileError ? (
                  <p className="mt-3 text-xs font-medium text-red-500">
                    {profileError}
                  </p>
                ) : profileInfo ? (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                    {profileInfo.bio}
                  </p>
                ) : null}
              </div>

              {profileInfo && !isLoadingProfile ? (
                <div className="grid grid-cols-3 divide-x divide-neutral-100 border-b border-neutral-100">
                  <div className="px-3 py-3 text-center">
                    <p className="text-lg font-extrabold tabular-nums text-emerald-600">
                      {profileInfo.wins}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Wins
                    </p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <p className="text-lg font-extrabold tabular-nums text-red-600">
                      {profileInfo.losses}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Losses
                    </p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <p className="text-lg font-extrabold tabular-nums text-neutral-950">
                      {profileInfo.gamesPlayed}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Games
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="p-3">
                <Link
                  href={`/${displayName}`}
                  onClick={() => setIsProfileOpen(false)}
                  className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-center text-sm font-bold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  role="menuitem"
                >
                  View Full Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        @keyframes navDropdownIn {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </nav>
  );
}

