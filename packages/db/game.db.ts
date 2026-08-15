import { client } from './user.db.js'

export type CreateGameInput = {
  whitePlayerId: string
  blackPlayerId: string
}

export const createGame = (data: CreateGameInput) => {
  return client.game.create({
    data: {
      whitePlayerId: data.whitePlayerId,
      blackPlayerId: data.blackPlayerId,
      status: 'PLAYING',
      startedAt: new Date()
    }
  })
}

export const finishGame = (gameId: string, opts?: { winnerId?: string | null; status?: 'FINISHED' | 'ABANDONED' }) => {
  return client.game.update({
    where: { id: gameId },
    data: {
      winnerId: opts?.winnerId ?? null,
      status: opts?.status ?? 'FINISHED',
      endedAt: new Date()
    }
  })
}

export const setGameStatus = (gameId: string, status: 'PLAYING' | 'FINISHED' | 'ABANDONED') => {
  return client.game.update({
    where: { id: gameId },
    data: { status }
  })
}

export const findGameById = (id: string) => {
  return client.game.findUnique({
    where: { id }
  })
}

export const listGamesForPlayer = (playerId: string) => {
  return client.game.findMany({
    where: {
      OR: [
        { whitePlayerId: playerId },
        { blackPlayerId: playerId }
      ]
    },
    orderBy: { createdAt: 'desc' }
  })
}

export default client
