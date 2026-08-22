import type { Request, Response } from "express";

import { listGameHistoryForUsername } from "@repo/db/game";
import { getPublicUserByUsername, searchUsersByUsername } from "@repo/db/user";

export const getPublicProfile = async (req: Request, res: Response) => {
  const usernameParam = req.params.username;
  const username =
    typeof usernameParam === "string" ? usernameParam.trim() : "";

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    // Fetch user (only public fields — no password / RefreshToken)
    const user = await getPublicUserByUsername(username);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch completed game history for this player
    const games = await listGameHistoryForUsername(username);

    const winRate =
      user.gamesPlayed > 0
        ? Math.round((user.wins / user.gamesPlayed) * 100)
        : 0;

    return res.status(200).json({
      message: "Profile fetched successfully",
      profile: {
        id: user.id,
        username: user.username,
        bio: user.bio ?? "No bio yet.",
        avatarUrl: user.avatarUrl ?? "/default-avatar.png",
        stats: {
          wins: user.wins,
          losses: user.losses,
          gamesPlayed: user.gamesPlayed,
          winRate,
        },
        joinedDate: new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        createdAt: user.createdAt,
      },
      recentGames: games ?? [],
    });
  } catch (error) {
    console.error("Get public profile error:", error);
    return res.status(500).json({ message: "Unable to fetch profile" });
  }
};
export const searchProfiles = async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (q.length < 2) {
    return res.status(200).json({ users: [] });
  }

  try {
    const users = await searchUsersByUsername(q);
    return res.status(200).json({ users });
  } catch (error) {
    console.error("Search profiles error:", error);
    return res.status(500).json({ message: "Search failed" });
  }
};
