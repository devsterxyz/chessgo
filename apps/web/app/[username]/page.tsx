"use client";

import Image from "next/image";
import { use, useState } from "react";
import { Navbar } from "../Navbar";

type Rating = {
  rating: number;
  delta: number;
  sparkline: number[];
};

type UserProfile = {
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  joinedDate: string;
  rating: Rating;
  gamesPlayed: number;
};

const dummyProfiles: Record<string, UserProfile> = {
  dev: {
    username: "devyougotit",
    name: "dev Sharma",
    bio: "I should've protected my queen",
    avatarUrl: "/default-avatar.png",
    joinedDate: "Jun 20, 2023",
    rating: {
      rating: 625,
      delta: -77,
      sparkline: [580, 610, 640, 620, 590, 630, 650, 625],
    },
    gamesPlayed: 2106,
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
    joinedDate: "Jan 1, 2024",
    rating: {
      rating: 800,
      delta: 0,
      sparkline: [800, 800, 800, 800, 800, 800, 800, 800],
    },
    gamesPlayed: 0,
  };
}


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
  const profile = getProfile(username);
  const [activeTab, setActiveTab] = useState("Overview");
  const displayName =
    profile.name.trim().toLowerCase() === profile.username.trim().toLowerCase()
      ? profile.username
      : `${profile.name} / ${profile.username}`;

  return (
    <>
      <Navbar />

      <main className="min-h-[calc(100vh-4rem)] bg-[#f7f5f0] px-3 py-5 text-neutral-950 sm:px-5 sm:py-6">
        <div className="mx-auto max-w-[1180px]">
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
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

                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-extrabold text-neutral-950 sm:text-3xl">
                        {displayName}
                      </h1>
                    </div>

                    <p className="mt-1 text-sm font-medium text-neutral-500">
                      @{profile.username}
                    </p>

                    <p className="mt-2 text-sm text-neutral-700">
                      {profile.bio}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                      <span>
                        <strong className="font-semibold text-neutral-700">
                          {profile.joinedDate}
                        </strong>{" "}
                        Joined
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
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

          {activeTab === "Overview" && (
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

          {activeTab === "Games" && (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xl shadow-neutral-200/70">
              <p className="text-sm font-medium text-neutral-500">
                Games tab — No completed games to display yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
