import 'dotenv/config'
import * as Prisma from '@prisma/client'

type CreateUserInput = {
  email: string;
  name: string;
  password?: string | null;
  googleId?: string | null;
  refreshToken?: string;
};

export const client = new (Prisma as any).PrismaClient()

export const findUserByEmail = (email: string) => {
  return client.user.findUnique({
    where: {email}
  })
}

export const createUser = (data: CreateUserInput) => {
  return client.user.create({
    data
  })
}

export const updateUserGoogleId = (id: number, googleId: string) => {
  return client.user.update({
    where: {id},
    data: {
      googleId
    }
  })
}

export const findUserByUserId = (id: number) => {
  return client.user.findUnique({
    where: {id},
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  })
}

export const updateUser = (id: number, refreshToken: string) => {
  return client.user.update({
    where: {id},
    data: {
      refreshToken
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  })
}
