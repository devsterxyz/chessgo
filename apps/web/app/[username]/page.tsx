"use client";

import Image from "next/image";
import { use, useState } from "react";
import { Navbar } from "../Navbar";

type RatingEntry = {
  category: string;
  rating: number;
  delta: number;
  sparkline: number[];
};

type UserProfile = {
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  isOnline: boolean;
  joinedDate: string;
  views: number;
  ratings: RatingEntry[];
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
};

const dummyProfiles: Record<string, UserProfile> = {
  dev: {
    username: "devyougotit",
    name: "dev Sharma",
    bio: "I should've protected my queen",
    avatarUrl: "/default-avatar.png",
    isOnline: true,
    joinedDate: "Jun 20, 2023",
    views: 60,
    ratings: [
      {
        category: "Blitz",
        rating: 625,
        delta: -77,
        sparkline: [580, 610, 640, 620, 590, 630, 650, 625],
      },
      {
        category: "Rapid",
        rating: 1182,
        delta: 50,
        sparkline: [1100, 1120, 1090, 1140, 1150, 1170, 1160, 1182],
      },
      {
        category: "Bullet",
        rating: 621,
        delta: 0,
        sparkline: [600, 590, 610, 615, 605, 620, 618, 621],
      },
    ],
    gamesPlayed: 2106,
    wins: 1048,
    draws: 189,
    losses: 869,
  },
};

function getProfile(paramUsername: string): UserProfile {
  const normalized = paramUsername.toLowerCase();
  if (dummyProfiles[normalized]) {
    return dummyProfiles[normalized];
  }

  return {
    username: paramUsername,
    name: paramUsername.charAt(0).toUpperCase() + paramUsername.slice(1),
    bio: "No bio yet.",
    avatarUrl: "/default-avatar.png",
    isOnline: false,
    joinedDate: "Jan 1, 2024",
    views: 12,
    ratings: [
      {
        category: "Blitz",
        rating: 800,
        delta: 0,
        sparkline: [800, 800, 800, 800, 800, 800, 800, 800],
      },
      {
        category: "Rapid",
        rating: 800,
        delta: 0,
        sparkline: [800, 800, 800, 800, 800, 800, 800, 800],
      },
      {
        category: "Bullet",
        rating: 800,
        delta: 0,
        sparkline: [800, 800, 800, 800, 800, 800, 800, 800],
      },
    ],
    gamesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  };
}

// -- Category SVG Icons ----------------------------------------------------

function CategoryIcon({ category }: { category: string }) {
  if (category === "Blitz") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4 text-emerald-600"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    );
  }

  if (category === "Rapid") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-emerald-600"
      >
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }

  // Bullet or default
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 text-emerald-600"
    >
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.5h-2v-5h2v5zm0-7h-2v-2h2v2z" />
    </svg>
  );
}

// -- Sparkline SVG ---------------------------------------------------------

function Sparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
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

// -- Rating Card -----------------------------------------------------------

function RatingCard({ entry }: { entry: RatingEntry }) {
  const isPositive = entry.delta > 0;
  const isNegative = entry.delta < 0;
  const sparkColor = isNegative
    ? "#ef4444"
    : isPositive
      ? "#10b981"
      : "#a3a3a3";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-emerald-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryIcon category={entry.category} />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            {entry.category}
          </span>
        </div>
        {entry.delta !== 0 && (
          <span
            className={`text-xs font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}
          >
            {isPositive ? "↑" : "↓"} {Math.abs(entry.delta)}
          </span>
        )}
      </div>

      <p className="mt-2 text-3xl font-extrabold tabular-nums text-neutral-950">
        {entry.rating}
      </p>

      <div className="mt-3">
        <Sparkline data={entry.sparkline} color={sparkColor} />
      </div>
    </div>
  );
}

// -- Stats Performance Bar -------------------------------------------------

function PerformanceBar({
  wins,
  draws,
  losses,
}: {
  wins: number;
  draws: number;
  losses: number;
}) {
  const total = wins + draws + losses;
  if (total === 0) {
    return <p className="text-sm text-neutral-400">No games played yet.</p>;
  }

  const winPct = (wins / total) * 100;
  const drawPct = (draws / total) * 100;
  const lossPct = (losses / total) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${winPct}%` }}
        />
        <div
          className="bg-neutral-300 transition-all"
          style={{ width: `${drawPct}%` }}
        />
        <div
          className="bg-red-400 transition-all"
          style={{ width: `${lossPct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-emerald-600">
          {wins} W ({winPct.toFixed(0)}%)
        </span>
        <span className="text-neutral-500">
          {draws} D ({drawPct.toFixed(0)}%)
        </span>
        <span className="text-red-500">
          {losses} L ({lossPct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

// -- Main Page Component ---------------------------------------------------

const TABS = ["Overview", "Games", "Stats"];

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const profile = getProfile(username);
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <>
      <Navbar />

      <main className="min-h-[calc(100vh-4rem)] bg-[#f7f5f0] px-3 py-5 text-neutral-950 sm:px-5 sm:py-6">
        <div className="mx-auto max-w-[1180px]">
          {/* Profile Header Card (Matching Inspo Image Layout) */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                {/* Left: Avatar + Info */}
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  {/* Avatar */}
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 sm:h-28 sm:w-28">
                    <Image
                      src={profile.avatarUrl}
                      alt={profile.username}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                      priority
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-col">
                    {/* Row 1: Username & Add Flair */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-extrabold text-neutral-950 sm:text-3xl">
                        {profile.username}
                      </h1>
                      <button
                        type="button"
                        className="rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-200"
                      >
                        Add flair
                      </button>
                    </div>

                    {/* Row 2: Real Name */}
                    <p className="mt-1 text-sm font-medium text-neutral-500">
                      {profile.name}
                    </p>

                    {/* Row 3: Bio */}
                    <p className="mt-2 text-sm text-neutral-700">
                      {profile.bio}
                    </p>

                    {/* Row 4: Joined, Views, Online Status */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                      <span>
                        <strong className="font-semibold text-neutral-700">
                          {profile.joinedDate}
                        </strong>{" "}
                        Joined
                      </span>
                      <span>
                        <strong className="font-semibold text-neutral-700">
                          {profile.views}
                        </strong>{" "}
                        Views
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online now
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Edit Profile Button */}
                <button
                  type="button"
                  className="self-start rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-200"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
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

          {/* Tab Content */}
          {activeTab === "Overview" && (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
              {/* Main Column */}
              <div className="flex flex-col gap-4">
                {/* Rating Cards */}
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Ratings
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {profile.ratings.map((entry) => (
                      <RatingCard key={entry.category} entry={entry} />
                    ))}
                  </div>
                </section>

                {/* Game History Placeholder */}
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                      Game History
                    </h2>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-500">
                      {profile.gamesPlayed.toLocaleString()} games
                    </span>
                  </div>
                  <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 font-mono text-xl font-bold text-neutral-400">
                      CG
                    </div>
                    <p className="mt-3 text-sm font-medium text-neutral-500">
                      No games recorded yet.
                    </p>
                  </div>
                </section>
              </div>

              {/* Sidebar Column */}
              <div className="flex flex-col gap-4">
                {/* Performance Breakdown */}
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Performance
                  </h2>
                  <div className="mt-4">
                    <PerformanceBar
                      wins={profile.wins}
                      draws={profile.draws}
                      losses={profile.losses}
                    />
                  </div>
                </section>

                {/* Best Rating */}
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Best Rating
                  </h2>
                  {(() => {
                    const best = [...profile.ratings].sort(
                      (a, b) => b.rating - a.rating,
                    )[0];
                    if (!best) return null;
                    return (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200">
                          <CategoryIcon category={best.category} />
                        </div>
                        <div>
                          <p className="text-2xl font-extrabold tabular-nums text-neutral-950">
                            {best.rating}
                          </p>
                          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                            {best.category}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </section>

                {/* Account Details */}
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Account Info
                  </h2>
                  <dl className="mt-3 flex flex-col gap-2.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Username</dt>
                      <dd className="font-bold text-neutral-950">
                        {profile.username}
                      </dd>
                    </div>
                    <div className="h-px bg-neutral-100" />
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Name</dt>
                      <dd className="font-bold text-neutral-950">
                        {profile.name}
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
                      <dt className="text-neutral-500">Status</dt>
                      <dd
                        className={`font-bold ${profile.isOnline ? "text-emerald-600" : "text-neutral-400"}`}
                      >
                        {profile.isOnline ? "Online now" : "Offline"}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          )}

          {activeTab === "Games" && (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xl shadow-neutral-200/70">
              <p className="text-sm font-medium text-neutral-500">
                Games tab — No completed games to display yet.
              </p>
            </div>
          )}

          {activeTab === "Stats" && (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xl shadow-neutral-200/70">
              <p className="text-sm font-medium text-neutral-500">
                Detailed stats breakdown coming soon.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
