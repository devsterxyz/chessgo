import type { Request, Response } from "express"
import { listGameHistoryForUsername } from "@repo/db/game"

export const getPlayerGameHistory = async (req: Request, res: Response) => {
  const usernameParam = req.params.username
  const username = typeof usernameParam === "string" ? usernameParam.trim() : ""

  if (!username) {
    return res.status(400).json({ message: "Username is required" })
  }

  try {
    const games = await listGameHistoryForUsername(username)

    if (!games) {
      return res.status(404).json({ message: "Player not found" })
    }

    return res.status(200).json({
      message: "Game history fetched successfully",
      games,
    })
  } catch (error) {
    console.error("Get player game history error:", error)
    return res.status(500).json({ message: "Unable to fetch game history" })
  }
}
