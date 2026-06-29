import 'dotenv/config'
// import { createUser, findUserByEmail, updateUser } from "../db/user.db.js"
import {
  ACCESS_TOKEN_COOKIE,
  COOKIE_OPTIONS,
  generateAccessAndRefreshTokens,
  REFRESH_TOKEN_COOKIE,
} from '../utils/tokens.utils.js';
import type { Request, Response } from "express";
import bcrypt from "bcrypt";

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
    .cookie("access_token", accessToken, ACCESS_TOKEN_COOKIE)
    .cookie("refresh_token", refreshToken, REFRESH_TOKEN_COOKIE)
    .json({ message, user: safeUser });
}

const registerUser = async (req: Request, res: Response) => {
  const {email, name, password} = req.body

  if (
    [email, name, password].some((field) => field?.trim() === "")
  ) {
    return res.status(400).
      json({
        message: "all fields require"
      })
  }

  const existedUser = await findUserByEmail(email)
  if(existedUser){  
    return res.status(400)
      .json({ message: "User already exists" });
  }
  
  try{
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser({
      email, 
      name,
      password: hashedPassword,
      refreshToken: ""
    })

    const tokens = generateAccessAndRefreshTokens(user.id);
    const safeUser = await updateUser(user.id, tokens.refreshToken);

    return issueTokensAndRespond(res, safeUser, 201, "User registered successfully", tokens);
  }
  catch (e: any) {
    console.error("Register user error:", e);

    if (e.code === "P2002") {
      return res.status(400).
        json({
          message: "Duplicate field (email)",
        });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }

}