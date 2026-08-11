import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

// -- Dummy data keyed by username ------------------------------------------

type RatingEntry = {
  category: string;
  icon: string;
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
  ratings: RatingEntry[];
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
};

const dummyProfiles: Record<string, UserProfile> = {
  dev: {
    username: "dev",
    name: "Dev Sharma",
    bio: "I should've protected my queen 👑",
    avatarUrl: "/default-avatar.png",
    isOnline: true,
    joinedDate: "Jun 20, 2023",
    ratings: [
      {
        category: "Blitz",
        icon: "⚡",
        rating: 625,
        delta: -77,
        sparkline: [580, 610, 640, 620, 590, 630, 650, 625],
      },
      {
        category: "Rapid",
        icon: "⏱",
        rating: 1182,
        delta: 50,
        sparkline: [1100, 1120, 1090, 1140, 1150, 1170, 1160, 1182],
      },
      {
        category: "Bullet",
        icon: "🔥",
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

function getProfile(username: string): UserProfile {
  if (dummyProfiles[username]) {
    return dummyProfiles[username];
  }

  // Fallback for any username – generates deterministic dummy data
  return {
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    bio: "No bio yet.",
    avatarUrl: "/default-avatar.png",
    isOnline: false,
    joinedDate: "Jan 1, 2024",
    ratings: [
      {
        category: "Blitz",
        icon: "⚡",
        rating: 800,
        delta: 0,
        sparkline: [800, 800, 800, 800, 800, 800, 800, 800],
      },
      {
        category: "Rapid",
        icon: "⏱",
        rating: 800,
        delta: 0,
        sparkline: [800, 800, 800, 800, 800, 800, 800, 800],
      },
      {
        category: "Bullet",
        icon: "🔥",
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
  const height = 32;
  const width = 120;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-full"
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

// -- Rating card -----------------------------------------------------------

function RatingCard({ entry }: { entry: RatingEntry }) {
  const isPositive = entry.delta > 0;
  const isNegative = entry.delta < 0;
  const sparkColor = isNegative
    ? "#ef4444"
    : isPositive
      ? "#10b981"
      : "#a3a3a3";

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{entry.icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {entry.category}
          </span>
        </div>
        {entry.delta !== 0 && (
          <span
            className={`text-xs font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(entry.delta)}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold tabular-nums text-neutral-950">
        {entry.rating}
      </p>
      <Sparkline data={entry.sparkline} color={sparkColor} />
    </div>
  );
}

// -- Stats ring (win/draw/loss bar) ----------------------------------------

function StatsBar({
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
    return (
      <p className="text-sm text-neutral-400">No games played yet.</p>
    );
  }

  const winPct = (wins / total) * 100;
  const drawPct = (draws / total) * 100;
  const lossPct = (losses / total) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
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
          {wins}W ({winPct.toFixed(0)}%)
        </span>
        <span className="text-neutral-500">
          {draws}D ({drawPct.toFixed(0)}%)
        </span>
        <span className="text-red-500">
          {losses}L ({lossPct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

// -- Metadata --------------------------------------------------------------

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = getProfile(username);

  return {
    title: `${profile.username} – ChessGo`,
    description: `${profile.name}'s chess profile on ChessGo.`,
  };
}

// -- Page ------------------------------------------------------------------

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = getProfile(username);

  return (
    <>
      {/* Navbar */}
      <nav className="border-b border-neutral-200 bg-white px-4 text-neutral-950 shadow-sm shadow-neutral-200/60">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between">
          <Link href="/play">
            <h1 className="text-xl font-extrabold">ChessGo</h1>
          </Link>
          <Link
            href="/play"
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            Play
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="min-h-[calc(100vh-4rem)] bg-[#f7f5f0] px-3 py-6 text-neutral-950 lg:px-5">
        <div className="mx-auto max-w-[1180px]">
          {/* Profile header card */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70">
            {/* Banner */}
            <div className="h-28 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 sm:h-36" />

            {/* Avatar + info */}
            <div className="relative px-5 pb-5 sm:px-8 sm:pb-6">
              {/* Avatar – overlaps the banner */}
              <div className="-mt-14 mb-4 sm:-mt-16">
                <div className="inline-block rounded-2xl border-4 border-white shadow-lg">
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.username}
                    width={112}
                    height={112}
                    className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28"
                    priority
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  {/* Username + status */}
                  <div className="flex items-center gap-3">
                    <h2 className="truncate text-2xl font-extrabold text-neutral-950">
                      {profile.username}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        profile.isOnline
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          profile.isOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                        }`}
                      />
                      {profile.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>

                  {/* Real name */}
                  <p className="mt-0.5 text-sm font-medium text-neutral-500">
                    {profile.name}
                  </p>

                  {/* Bio */}
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-700">
                    {profile.bio}
                  </p>

                  {/* Join date */}
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Joined {profile.joinedDate}
                  </p>
                </div>

                {/* Quick stats pill */}
                <div className="flex shrink-0 items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-3">
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-neutral-950">
                      {profile.gamesPlayed.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Games
                    </p>
                  </div>
                  <div className="h-8 w-px bg-neutral-200" />
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-emerald-600">
                      {profile.wins.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Wins
                    </p>
                  </div>
                  <div className="h-8 w-px bg-neutral-200" />
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-red-500">
                      {profile.losses.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Losses
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ratings + Game history */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
            {/* Left column – ratings + win/loss bar */}
            <div className="flex flex-col gap-4">
              {/* Rating cards */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Ratings
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {profile.ratings.map((entry) => (
                    <RatingCard key={entry.category} entry={entry} />
                  ))}
                </div>
              </section>

              {/* Game history placeholder */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Game History
                  </h3>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-500">
                    {profile.gamesPlayed.toLocaleString()}
                  </span>
                </div>

                <div className="mt-5 flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-2xl text-neutral-400">
                    ♟
                  </div>
                  <p className="text-sm font-medium text-neutral-400">
                    Game history will appear here.
                  </p>
                </div>
              </section>
            </div>

            {/* Right column – stats sidebar */}
            <div className="flex flex-col gap-4">
              {/* Win/Draw/Loss breakdown */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Performance
                </h3>
                <div className="mt-4">
                  <StatsBar
                    wins={profile.wins}
                    draws={profile.draws}
                    losses={profile.losses}
                  />
                </div>
              </section>

              {/* Best rating highlight */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Best Rating
                </h3>
                {(() => {
                  const best = [...profile.ratings].sort(
                    (a, b) => b.rating - a.rating,
                  )[0];
                  if (!best) return null;
                  return (
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                        {best.icon}
                      </div>
                      <div>
                        <p className="text-3xl font-extrabold tabular-nums text-neutral-950">
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

              {/* Member info */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/70">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                  About
                </h3>
                <dl className="mt-4 flex flex-col gap-3 text-sm">
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
        </div>
      </main>
    </>
  );
}
