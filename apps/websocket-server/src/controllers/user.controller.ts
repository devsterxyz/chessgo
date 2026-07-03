import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { countGuestUsers, createUser, findUserByUsername } from "@repo/db"
import { generateAccessAndRefreshTokens, generateAccessToken } from "../utils/tokens.utils.js";

type AuthTokens = ReturnType<typeof generateAccessAndRefreshTokens>;

const issueTokensAndRespond = (
  res: Response,
  safeUser: object,
  statusCode: number,
  message: string,
  tokens: AuthTokens,
) => {
  const { accessToken, refreshToken } = tokens;

  return res
    .status(statusCode)
    .json({ message, user: safeUser, accessToken, refreshToken });
}

export const registerUser = async (req: Request, res: Response) => {
  const { username, password } = req.body

  if (
    [username, password].some((field) => typeof field !== "string" || field.trim() === "")
  ) {
    return res.status(400).
      json({
        message: "Username and password are required"
      })
  }

  const existedUser = await findUserByUsername(username)
  if (existedUser) {
    return res.status(400)
      .json({ message: "User already exists" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser({
      password: hashedPassword,
      username
    })
    const tokens = generateAccessAndRefreshTokens(user.id);
    const safeUser = {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    };

    return issueTokensAndRespond(
      res,
      safeUser,
      201,
      "User registered successfully",
      tokens
    );
  }
  catch (e: any) {
    console.error("Register user error:", e);

    if (e.code === "P2002") {
      return res.status(400).
        json({
          message: "Username already exists",
        });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }

}

export const signInUser = async (req: Request, res: Response) => {
  const { username, password } = req.body

  if (
    [username, password].some((field) => typeof field !== "string" || field.trim() === "")
  ) {
    return res.status(400).json({
      message: "Username and password are required"
    })
  }

  try {
    const user = await findUserByUsername(username)

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" })
    }

    if (!user.password) {
      return res.status(401).json({ message: "Invalid username or password" })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" })
    }

    const tokens = generateAccessAndRefreshTokens(user.id);
    const safeUser = {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    };

    return issueTokensAndRespond(
      res,
      safeUser,
      200,
      "Signed in successfully",
      tokens
    );
  } catch (e) {
    console.error("Sign in user error:", e);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

export const logoutUser = async (req: Request, res: Response) => {
  try {
    return res
      .status(200)
      .json({ message: "Logged out successfully" });
  } catch (e: any) {
    return res.status(500).json({
      message: "Unable to logout user"
    });
  }
}


export const createGuestUser = async (req: Request, res: Response) => {
  try {
    let nextGuestNumber = (await countGuestUsers()) + 1;

    while (true) {
      try {
        const username = `guestuser${nextGuestNumber}`;
        const user = await createUser({
          username
        });
        const tokens = generateAccessAndRefreshTokens(user.id);
        const safeUser = {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt
        };

        return issueTokensAndRespond(
          res,
          safeUser,
          201,
          "Guest user created successfully",
          tokens
        );
      } catch (e: any) {
        if (e.code !== "P2002") {
          throw e;
        }

        nextGuestNumber += 1;
      }
    }
  } catch (e) {
    console.error("Create guest user error:", e);

    return res.status(500).json({
      message: "Server error",
    });
  }
}
