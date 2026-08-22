import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

type CreateUserInput = {
  username: string;
  password?: string;
};

const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env')

config({ path: envPath })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize PrismaClient')
}

const adapter = new PrismaPg({ connectionString })

export const client: PrismaClient = new PrismaClient({ adapter } as any)

export const findUserByUsername = (username: string) => {
  return client.user.findUnique({
    where: { username }
  })
}

export const createUser = (data: CreateUserInput) => {
  return client.user.create({
    data: {
      username: data.username,
      password: data.password ?? null
    },
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      wins: true,
      losses: true,
      gamesPlayed: true,
      createdAt: true
    }
  })
}

export const countGuestUsers = () => {
  return client.user.count({
    where: {
      username: {
        startsWith: "guestuser"
      }
    }
  })
}

export const updateRefreshToken = (id: number, refreshToken: string) => {
  return client.user.update({
    where: { id },
    data: {
      RefreshToken: refreshToken
    },
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      wins: true,
      losses: true,
      gamesPlayed: true,
      createdAt: true
    }
  })
}

export const findUserByUserId = (id: number) => {
  return client.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      wins: true,
      losses: true,
      gamesPlayed: true,
      createdAt: true
    }
  })
}


export const getPublicUserByUsername = (username: string) => {
  return client.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      wins: true,
      losses: true,
      gamesPlayed: true,
      createdAt: true
    }
  })
}

export const updateUserProfile = (id: number,
    data: {
      username?: string
      bio?: string
      avatarUrl?: string
    }
  ) => {
  return client.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      wins: true,
      losses: true,
      gamesPlayed: true,
      createdAt: true
    }
  })
}

export const searchUsersByUsername = (query: string, limit = 5) => {
  return client.user.findMany({
    where: {
      username: {
        contains: query,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      username: true,
      bio: true,
      gamesPlayed: true,
    },
    take: limit,
    orderBy: { username: 'asc' },
  })
}