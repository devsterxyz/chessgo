import { client } from "./user.db.ts"

export type CreateGameInput = {
  whitePlayerId: string
  blackPlayerId: string
}

export type GameHistoryItem = {
  id: string
  whiteUsername: string
  blackUsername: string
  winnerUsername: string | null
  moves: number
  date: Date
}

export const createGame = (data: CreateGameInput) => {
  return client.game.create({
    data: {
      whitePlayerId: data.whitePlayerId,
      blackPlayerId: data.blackPlayerId,
      status: "PLAYING",
      startedAt: new Date(),
    },
    select: {
      id: true,
    },
  })
}

export const finishGame = (
  gameId: string,
  opts?: {
    winnerId?: string | null
    status?: "FINISHED" | "ABANDONED"
    moves?: number
  },
) => {
  return client.game.update({
    where: { id: gameId },
    data: {
      winnerId: opts?.winnerId ?? null,
      status: opts?.status ?? "FINISHED",
      ...(typeof opts?.moves === "number" ? { moves: opts.moves } : {}),
      endedAt: new Date(),
    },
  })
}

export const setGameStatus = (gameId: string, status: "PLAYING" | "FINISHED" | "ABANDONED") => {
  return client.game.update({
    where: { id: gameId },
    data: { status },
  })
}

export const findGameById = (id: string) => {
  return client.game.findUnique({
    where: { id },
  })
}

export const listGamesForPlayer = (playerId: string) => {
  return client.game.findMany({
    where: {
      OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
    },
    orderBy: { createdAt: "desc" },
  })
}

export const listGameHistoryForUsername = async (username: string): Promise<GameHistoryItem[] | null> => {
  const player = await client.user.findUnique({
    where: { username },
    select: { id: true },
  })

  if (!player) {
    return null
  }

  const playerId = String(player.id)
  const games = await client.game.findMany({
    where: {
      status: {
        not: "PLAYING",
      },
      OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
    },
    orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      whitePlayerId: true,
      blackPlayerId: true,
      winnerId: true,
      moves: true,
      endedAt: true,
      createdAt: true,
    },
  })

  const numericPlayerIds = Array.from(
    new Set(games.flatMap((game) => [Number(game.whitePlayerId), Number(game.blackPlayerId), game.winnerId ? Number(game.winnerId) : null]).filter((id): id is number => Number.isInteger(id))),
  )

  const users = await client.user.findMany({
    where: {
      id: {
        in: numericPlayerIds,
      },
    },
    select: {
      id: true,
      username: true,
    },
  })

  const usernameById = new Map(users.map((user) => [String(user.id), user.username]))

  return games.map((game) => ({
    id: game.id,
    whiteUsername: usernameById.get(game.whitePlayerId) ?? `Player ${game.whitePlayerId}`,
    blackUsername: usernameById.get(game.blackPlayerId) ?? `Player ${game.blackPlayerId}`,
    winnerUsername: game.winnerId ? (usernameById.get(game.winnerId) ?? `Player ${game.winnerId}`) : null,
    moves: game.moves,
    date: game.endedAt ?? game.createdAt,
  }))
}

export default client
