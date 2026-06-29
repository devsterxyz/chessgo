import 'dotenv/config'
import jwt from 'jsonwebtoken'
import type { CookieOptions } from 'express'


export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.DEV_MODE !== "true",  // false locally, true in production
  sameSite: process.env.DEV_MODE === "true" ? "lax" : "none", // lax locally, none in production
}

console.log("Cookie secure mode:", process.env.DEV_MODE !== "true")

export const ACCESS_TOKEN_COOKIE: CookieOptions = {
  ...COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000,           // 15 min
}

export const REFRESH_TOKEN_COOKIE: CookieOptions = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}


const getJwtSecrets = () => {
  const accessTokenSecret = process.env.JWT_SECRET_KEY;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET_KEY || accessTokenSecret;

  if (!accessTokenSecret || !refreshTokenSecret) {
    throw new Error("JWT secrets are not defined in environment variables");
  }

  return { accessTokenSecret, refreshTokenSecret };
}

export const generateAccessToken = (userId: number) => {
  const { accessTokenSecret } = getJwtSecrets();

  return jwt.sign(
    { userId },
    accessTokenSecret,
    { expiresIn: "15m" }
  );
}

export const generateRefreshToken = (userId: number) => {
  const { refreshTokenSecret } = getJwtSecrets();

  return jwt.sign(
    { userId },
    refreshTokenSecret,
    { expiresIn: "7d" }
  );
}

export const generateAccessAndRefreshTokens = (userId: number) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
}
