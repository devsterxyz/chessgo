import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { createUser, findUserByUsername } from "@repo/db"

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
  if(existedUser){  
    return res.status(400)
      .json({ message: "User already exists" });
  }
  
  try{
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser({
      password: hashedPassword,
      username
    })

    return res.status(201).json({
      message: "User registered successfully",
      user
    });
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

    const isPasswordValid = await bcrypt.compare(password, user.passwork)

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" })
    }

    return res.status(200).json({
      message: "Signed in successfully",
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      }
    })
  } catch (e) {
    console.error("Sign in user error:", e);

    return res.status(500).json({
      message: "Server error",
    });
  }
}
