"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Navbar } from "../Navbar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

type Rating = {
  rating: number;
  delta: number;
  sparkline: number[];
};

type UserProfile = {
  id: string;
  username: string;
  bio: string;
  joinedDate: string;
  rating: Rating;
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

type ApiRating = {
  rating: number;
  delta: number;
  sparkline: number[];
};

type ApiUserProfile = {
  id: string | number;
  username: string;
  bio?: string | null;
  rating?: number | ApiRating | null;
  gamesPlayed?: number | null;
  createAt?: string | Date | null;
  createdAt?: string | Date | null;
  joinedDate?: string | null;
};

type ProfileResponse = {
  message?: string;
  user?: ApiUserProfile;
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

function extractRating(rating?: number | ApiRating | null): Rating {
  if (rating == null) {
    return {
      rating: 800,
      delta: 0,
      sparkline: Array.from({ length: 8 }, () => 800),
    };
  }

  if (typeof rating === "number") {
    return {
      rating,
      delta: 0,
      sparkline: Array.from({ length: 8 }, () => rating),
    };
  }

  const value = rating.rating ?? 800;
  return {
    rating: value,
    delta: rating.delta ?? 0,
    sparkline:
      rating.sparkline?.length >= 2
        ? rating.sparkline
        : Array.from({ length: 8 }, () => value),
  };
}

function toProfile(user: ApiUserProfile): UserProfile {
  return {
    id: String(user.id),
    username: user.username,
    bio: user.bio?.trim() || "No bio yet.",
    joinedDate:
      user.joinedDate || formatJoinedDate(user.createdAt ?? user.createAt),
    rating: extractRating(user.rating),
    gamesPlayed: user.gamesPlayed ?? 0,
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

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return <div className="h-9 rounded bg-neutral-100" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 36;
  const width = 140;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GameHistorySection({
  games,
  isLoading,
  errorMessage,
}: {
  games: GameHistoryItem[];
  isLoading: boolean;
  errorMessage: string;
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
          <div className="hidden grid-cols-[minmax(220px,1fr)_180px_90px_140px] bg-neutral-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 md:grid">
            <span>Players</span>
            <span>Winner</span>
            <span className="text-right">Moves</span>
            <span className="text-right">Date</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {games.map((game) => (
              <div
                key={game.id}
                className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(220px,1fr)_180px_90px_140px] md:items-center"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-bold text-neutral-950">
                    {game.whiteUsername}
                  </span>
                  <span className="truncate font-bold text-neutral-600">
                    {game.blackUsername}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 md:block">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 md:hidden">
                    Winner
                  </span>
                  <span className="font-bold text-emerald-700">
                    {game.winnerUsername ?? "Draw"}
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

function RatingCard({ rating }: { rating: Rating }) {
  const isPositive = rating.delta > 0;
  const isNegative = rating.delta < 0;
  const sparkColor = isNegative
    ? "#ef4444"
    : isPositive
      ? "#10b981"
      : "#a3a3a3";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-emerald-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Rating
        </span>
        {rating.delta !== 0 && (
          <span
            className={`text-xs font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}
          >
            {isPositive ? "↑" : "↓"} {Math.abs(rating.delta)}
          </span>
        )}
      </div>

      <p className="mt-2 text-3xl font-extrabold tabular-nums text-neutral-950">
        {rating.rating}
      </p>

      <div className="mt-3">
        <Sparkline data={rating.sparkline} color={sparkColor} />
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

      const token = localStorage.getItem("chessgo_access_token");

      if (!token) {
        setProfile(null);
        setErrorMessage("Sign in to view your profile.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/user/getProfile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        const data = (await response.json()) as ProfileResponse;

        if (!response.ok || !data.user) {
          setProfile(null);
          setErrorMessage(data.message ?? "Unable to load your profile.");
          return;
        }

        setProfile(toProfile(data.user));
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
  }, []);

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
                          <strong className="font-semibold text-neutral-700">
                            {profile.rating.rating}
                          </strong>{" "}
                          Rating
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startEditingBio}
                  disabled={!profile || isEditingBio || isLoading}
                  className="self-start rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-200"
                >
                  Edit Profile
                </button>
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
                    Rating
                  </h2>
                  <div className="mt-4">
                    <RatingCard rating={profile.rating} />
                  </div>
                </section>

                <GameHistorySection
                  games={gameHistory}
                  isLoading={isGameHistoryLoading}
                  errorMessage={gameHistoryError}
                />
              </div>

              <div className="flex flex-col gap-4">
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Current Rating
                  </h2>
                  <p className="mt-3 text-3xl font-extrabold tabular-nums text-neutral-950">
                    {profile.rating.rating}
                  </p>
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
                      <dt className="text-neutral-500">Rating</dt>
                      <dd className="font-bold text-neutral-950">
                        {profile.rating.rating}
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
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
