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

type SearchUser = {
  id: number;
  username: string;
  bio?: string | null;
  gamesPlayed?: number | null;
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
  const searchRef = useRef<HTMLDivElement | null>(null);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/profile/search?q=${encodeURIComponent(trimmed)}`,
        );
        const data = (await res.json()) as { users?: SearchUser[] };
        setSearchResults(data.users ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      setIsSearchLoading(false);
    };
  }, [searchQuery]);

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
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3">
        <Link href="/play" onClick={closeGameSocket}>
          <h1 className="text-xl font-extrabold">ChessGo</h1>
        </Link>

        {/* Player search */}
        <div ref={searchRef} className="relative hidden w-full max-w-xs sm:block">
          <div className="relative flex items-center">
            <svg
              className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z"
              />
            </svg>
            <input
              id="player-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                  setIsSearchFocused(false);
                }
              }}
              autoComplete="off"
              placeholder="Search players…"
              className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-8 pr-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {isSearchFocused && searchQuery.trim().length >= 2 && (
            <div
              className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70"
              style={{ animation: "navDropdownIn 0.12s ease-out" }}
            >
              {isSearchLoading ? (
                <p className="px-4 py-3 text-sm text-neutral-400">Searching…</p>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-neutral-500">
                  No player found for{" "}
                  <span className="font-bold text-neutral-800">
                    &ldquo;{searchQuery.trim()}&rdquo;
                  </span>
                </p>
              ) : (
                <ul role="listbox">
                  {searchResults.map((user) => (
                    <li key={user.id} role="option" aria-selected={false}>
                      <Link
                        href={`/${user.username}`}
                        onClick={() => {
                          setSearchQuery("");
                          setIsSearchFocused(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-emerald-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-[10px] font-extrabold text-white">
                          {user.username.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-neutral-950">
                            {user.username}
                          </p>
                          {user.gamesPlayed ? (
                            <p className="text-xs text-neutral-400">
                              {user.gamesPlayed} games
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

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

