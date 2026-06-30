import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

type CreateUserInput = {
  username: string;
  password: string;
};

const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env')

config({ path: envPath })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize PrismaClient')
}

const adapter = new PrismaPg({ connectionString })

export const client = new PrismaClient({ adapter })

export const findUserByUsername = (username: string) => {
  return client.user.findUnique({
    where: { username }
  })
}

export const createUser = (data: CreateUserInput) => {
  return client.user.create({
    data: {
      username: data.username,
      passwork: data.password
    },
    select: {
      id: true,
      username: true,
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
      createdAt: true
    }
  })
}
