"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { closeGameSocket } from "../lib/gameSocket";
import { Navbar } from "../Navbar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

type UserProfile = {
  id: string;
  username: string;
  bio: string;
  joinedDate: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
};

type GameHistoryItem = {
  id: string;
  whiteUsername: string;
  blackUsername: string;
  winnerUsername: string | null;
  moves: number;
  date: string | Date;
};

type ApiUserProfile = {
  id: string | number;
  username: string;
  bio?: string | null;
  wins?: number | null;
  losses?: number | null;
  gamesPlayed?: number | null;
  createAt?: string | Date | null;
  createdAt?: string | Date | null;
  joinedDate?: string | null;
};

type ProfileResponse = {
  message?: string;
  user?: ApiUserProfile;
};

// Shape returned by the public GET /profile/:username endpoint
type ApiPublicProfile = {
  id: string | number;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  stats?: {
    wins?: number | null;
    losses?: number | null;
    gamesPlayed?: number | null;
    winRate?: number | null;
  } | null;
  joinedDate?: string | null;
  createdAt?: string | Date | null;
};

type PublicProfileResponse = {
  message?: string;
  profile?: ApiPublicProfile;
};

type GameHistoryResponse = {
  message?: string;
  games?: GameHistoryItem[];
};

const MAX_BIO_LENGTH = 200;

function formatJoinedDate(createdAt?: string | Date | null) {
  if (!createdAt) {
    return "Unknown";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toProfile(user: ApiUserProfile): UserProfile {
  return {
    id: String(user.id),
    username: user.username,
    bio: user.bio?.trim() || "No bio yet.",
    joinedDate:
      user.joinedDate || formatJoinedDate(user.createdAt ?? user.createAt),
    wins: user.wins ?? 0,
    losses: user.losses ?? 0,
    gamesPlayed: user.gamesPlayed ?? 0,
  };
}

// Maps the public /profile/:username response shape
function toPublicProfile(p: ApiPublicProfile): UserProfile {
  return {
    id: String(p.id),
    username: p.username,
    bio: p.bio?.trim() || "No bio yet.",
    joinedDate: p.joinedDate || formatJoinedDate(p.createdAt),
    wins: p.stats?.wins ?? 0,
    losses: p.stats?.losses ?? 0,
    gamesPlayed: p.stats?.gamesPlayed ?? 0,
  };
}

function getInitials(username: string) {
  return username.trim().slice(0, 2).toUpperCase() || "CG";
}

function formatGameDate(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}



function GameHistorySection({
  games,
  isLoading,
  errorMessage,
  currentUser,
}: {
  games: GameHistoryItem[];
  isLoading: boolean;
  errorMessage: string;
  currentUser?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Game History
        </h2>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-500">
          {games.length.toLocaleString()} games
        </span>
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-neutral-100" />
          <p className="mt-3 text-sm font-medium text-neutral-500">
            Loading games...
          </p>
        </div>
      ) : errorMessage ? (
        <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : games.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 font-mono text-xl font-bold text-neutral-400">
            CG
          </div>
          <p className="mt-3 text-sm font-medium text-neutral-500">
            No games recorded yet.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-neutral-100">
          <div className="hidden gap-3 bg-neutral-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 md:grid md:grid-cols-[minmax(220px,1fr)_120px_90px_140px]">
            <span>Players</span>
            <span>Result</span>
            <span className="text-right">Moves</span>
            <span className="text-right">Date</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {games.map((game) => (
              <div
                key={game.id}
                className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(220px,1fr)_120px_90px_140px] md:items-center"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-bold text-neutral-950 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block w-3 h-3 border border-neutral-300 bg-white"
                    />
                    <span className="truncate">{game.whiteUsername}</span>
                  </span>
                  <span className="truncate font-bold text-neutral-600 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block w-3 h-3 bg-neutral-950"
                    />
                    <span className="truncate">{game.blackUsername}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 md:block">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 md:hidden">
                    Result
                  </span>
                  <span className="md:text-left md:font-bold">
                    {(() => {
                      const me = currentUser ?? null;
                      if (!game.winnerUsername) {
                        return (
                          <span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-sm font-bold text-neutral-700 bg-neutral-200">
                            ½
                          </span>
                        );
                      }

                      if (me && game.winnerUsername === me) {
                        return (
                          <span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-sm font-bold text-white bg-emerald-600">
                            +
                          </span>
                        );
                      }

                      return (
                        <span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-sm font-bold text-white bg-red-600">
                          -
                        </span>
                      );
                    })()}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 md:block md:text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 md:hidden">
                    Moves
                  </span>
                  <span className="font-semibold tabular-nums text-neutral-700">
                    {game.moves}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 md:block md:text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 md:hidden">
                    Date
                  </span>
                  <span className="font-medium text-neutral-500">
                    {formatGameDate(game.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PerformanceStats({ wins, losses, gamesPlayed }: { wins: number; losses: number; gamesPlayed: number }) {
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Wins
        </span>
        <p className="mt-2 text-3xl font-extrabold tabular-nums text-emerald-600">
          {wins}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Losses
        </span>
        <p className="mt-2 text-3xl font-extrabold tabular-nums text-red-600">
          {losses}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Win Rate
        </span>
        <p className="mt-2 text-3xl font-extrabold tabular-nums text-neutral-950">
          {winRate}%
        </p>
      </div>
    </div>
  );
}

const TABS = ["Overview", "Games"];

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [bioError, setBioError] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [gameHistoryError, setGameHistoryError] = useState("");
  const [isGameHistoryLoading, setIsGameHistoryLoading] = useState(true);
  const displayName = profile?.username ?? username;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const router = useRouter();

  // Determine whether the viewer is looking at their own profile.
  // Always start null so SSR and initial client render agree (no hydration mismatch).
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const isOwnProfile = Boolean(
    loggedInUsername &&
      username.toLowerCase() === loggedInUsername.toLowerCase(),
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("chessgo_user");
      if (!stored) return;
      const parsed = JSON.parse(stored) as { username?: string };
      setLoggedInUsername(parsed.username?.trim() ?? null);
    } catch {
      // ignore malformed data
    }
  }, []);

  function startEditingBio() {
    if (!profile) return;

    setBioDraft(profile.bio === "No bio yet." ? "" : profile.bio);
    setBioError("");
    setIsEditingBio(true);
  }

  function cancelEditingBio() {
    setIsEditingBio(false);
    setBioDraft("");
    setBioError("");
  }

  async function saveBio() {
    const token = localStorage.getItem("chessgo_access_token");
    const nextBio = bioDraft.trim();

    if (!token) {
      setBioError("Sign in again to update your profile.");
      return;
    }

    if (nextBio.length > MAX_BIO_LENGTH) {
      setBioError(`Bio must be ${MAX_BIO_LENGTH} characters or less.`);
      return;
    }

    setIsSavingBio(true);
    setBioError("");

    try {
      const response = await fetch(`${API_BASE_URL}/user/updateProfile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: nextBio }),
      });
      const data = (await response.json()) as ProfileResponse;

      if (
        response.status === 401 ||
        (data && /token expired/i.test(String(data.message ?? "")))
      ) {
        closeGameSocket();
        localStorage.removeItem("chessgo_user");
        localStorage.removeItem("chessgo_access_token");
        localStorage.removeItem("chessgo_refresh_token");
        setBioError("Session expired. Please sign in again.");
        router.replace("/");
        return;
      }

      if (!response.ok || !data.user) {
        setBioError(data.message ?? "Unable to update your bio.");
        return;
      }

      const updatedProfile = toProfile(data.user);
      setProfile(updatedProfile);
      setIsEditingBio(false);
      setBioDraft("");

      const storedUser = localStorage.getItem("chessgo_user");
      if (storedUser) {
        const user = JSON.parse(storedUser) as Record<string, unknown>;
        localStorage.setItem(
          "chessgo_user",
          JSON.stringify({ ...user, ...data.user }),
        );
      }
    } catch {
      setBioError("Could not connect to the backend server.");
    } finally {
      setIsSavingBio(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        // Public endpoint — no auth token required. Works for any username.
        const response = await fetch(
          `${API_BASE_URL}/profile/${encodeURIComponent(username)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as PublicProfileResponse;

        if (!response.ok || !data.profile) {
          setProfile(null);
          setErrorMessage(
            response.status === 404
              ? `No user found with the username "${username}".`
              : (data.message ?? "Unable to load profile."),
          );
          return;
        }

        setProfile(toPublicProfile(data.profile));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setProfile(null);
        setErrorMessage("Could not connect to the backend server.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();

    return () => controller.abort();
  }, [username]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGameHistory() {
      setIsGameHistoryLoading(true);
      setGameHistoryError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/game/history/${encodeURIComponent(username)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as GameHistoryResponse;

        if (
          response.status === 401 ||
          (data && /token expired/i.test(String(data.message ?? "")))
        ) {
          closeGameSocket();
          localStorage.removeItem("chessgo_user");
          localStorage.removeItem("chessgo_access_token");
          localStorage.removeItem("chessgo_refresh_token");
          setGameHistory([]);
          setGameHistoryError("Session expired. Please sign in again.");
          return;
        }

        if (!response.ok || !data.games) {
          setGameHistory([]);
          setGameHistoryError(data.message ?? "Unable to load games.");
          return;
        }

        setGameHistory(data.games);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setGameHistory([]);
        setGameHistoryError("Could not connect to the backend server.");
      } finally {
        setIsGameHistoryLoading(false);
      }
    }

    loadGameHistory();

    return () => controller.abort();
  }, [username]);

  return (
    <>
      <Navbar />

      <main className="min-h-[calc(100vh-4rem)] bg-[#f7f5f0] px-3 py-5 text-neutral-950 sm:px-5 sm:py-6">
        <div className="mx-auto max-w-[1180px]">
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-3xl font-extrabold text-white sm:h-28 sm:w-28">
                    {initials}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-extrabold text-neutral-950 sm:text-3xl">
                        {displayName}
                      </h1>
                    </div>

                    <p className="mt-1 text-sm font-medium text-neutral-500">
                      @{displayName}
                    </p>

                    {isEditingBio ? (
                      <div className="mt-3 flex max-w-xl flex-col gap-2">
                        <textarea
                          value={bioDraft}
                          onChange={(event) => {
                            setBioDraft(event.target.value);
                            if (bioError) setBioError("");
                          }}
                          maxLength={MAX_BIO_LENGTH}
                          rows={3}
                          className="min-h-24 resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          placeholder="Tell players a little about your chess style."
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs font-medium text-neutral-500">
                            {bioDraft.trim().length}/{MAX_BIO_LENGTH}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={cancelEditingBio}
                              disabled={isSavingBio}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveBio}
                              disabled={isSavingBio}
                              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                            >
                              {isSavingBio ? "Saving..." : "Save Bio"}
                            </button>
                          </div>
                        </div>
                        {bioError ? (
                          <p className="text-sm font-semibold text-red-600">
                            {bioError}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 max-w-xl text-sm text-neutral-700 [overflow-wrap:anywhere]">
                        {isLoading ? "Loading profile..." : profile?.bio}
                      </p>
                    )}

                    {profile ? (
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                        <span>
                          <strong className="font-semibold text-neutral-700">
                            {profile.joinedDate}
                          </strong>{" "}
                          Joined
                        </span>
                        <span>
                          <strong className="font-semibold text-emerald-700">
                            {profile.wins}
                          </strong>{" "}
                          Wins
                        </span>
                        <span>
                          <strong className="font-semibold text-red-700">
                            {profile.losses}
                          </strong>{" "}
                          Losses
                        </span>
                        <span>
                          <strong className="font-semibold text-neutral-700">
                            {profile.gamesPlayed}
                          </strong>{" "}
                          Games
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={startEditingBio}
                    disabled={!profile || isEditingBio || isLoading}
                    className="self-start rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-200"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="flex border-t border-neutral-200 px-5 sm:px-7">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-3.5 text-sm font-bold transition ${
                    activeTab === tab
                      ? "text-neutral-950"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-xl shadow-neutral-200/70">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xl shadow-neutral-200/70">
              <p className="text-sm font-medium text-neutral-500">
                Loading profile...
              </p>
            </div>
          ) : null}

          {profile && activeTab === "Overview" && (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
              <div className="flex flex-col gap-4">
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Performance
                  </h2>
                  <div className="mt-4">
                    <PerformanceStats
                      wins={profile.wins}
                      losses={profile.losses}
                      gamesPlayed={profile.gamesPlayed}
                    />
                  </div>
                </section>

                <GameHistorySection
                  games={gameHistory}
                  isLoading={isGameHistoryLoading}
                  errorMessage={gameHistoryError}
                  currentUser={displayName}
                />
              </div>

              <div className="flex flex-col gap-4">
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Record Overview
                  </h2>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-extrabold tabular-nums text-emerald-600">
                        {profile.wins} W
                      </p>
                      <p className="text-xs text-neutral-500">Wins</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold tabular-nums text-red-600">
                        {profile.losses} L
                      </p>
                      <p className="text-xs text-neutral-500">Losses</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold tabular-nums text-neutral-950">
                        {profile.gamesPlayed}
                      </p>
                      <p className="text-xs text-neutral-500">Total Games</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Account Info
                  </h2>
                  <dl className="mt-3 flex flex-col gap-2.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Username</dt>
                      <dd className="text-right font-bold text-neutral-950">
                        {displayName}
                      </dd>
                    </div>
                    <div className="h-px bg-neutral-100" />
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Joined</dt>
                      <dd className="font-bold text-neutral-950">
                        {profile.joinedDate}
                      </dd>
                    </div>
                    <div className="h-px bg-neutral-100" />
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Wins</dt>
                      <dd className="font-bold text-emerald-600">
                        {profile.wins}
                      </dd>
                    </div>
                    <div className="h-px bg-neutral-100" />
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Losses</dt>
                      <dd className="font-bold text-red-600">
                        {profile.losses}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          )}

          {profile && activeTab === "Games" && (
            <div className="mt-4">
              <GameHistorySection
                games={gameHistory}
                isLoading={isGameHistoryLoading}
                errorMessage={gameHistoryError}
                currentUser={displayName}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
