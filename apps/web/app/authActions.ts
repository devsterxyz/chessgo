"use server";

const API_BASE_URL = process.env.API_URL ?? "http://localhost:3002";

type AuthUser = {
  id: string;
  username: string;
  createdAt: string;
};

type AuthResult =
  | {
      ok: true;
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }
  | {
      ok: false;
      message: string;
    };

type AuthResponse = {
  message?: string;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
};

async function requestAuth(endpoint: string, body?: Record<string, string>) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as AuthResponse;

    if (
      !response.ok ||
      !data.user ||
      !data.accessToken ||
      !data.refreshToken
    ) {
      return {
        ok: false,
        message: data.message ?? "Something went wrong",
      } satisfies AuthResult;
    }

    return {
      ok: true,
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    } satisfies AuthResult;
  } catch {
    return {
      ok: false,
      message: "Could not connect to the backend server",
    } satisfies AuthResult;
  }
}

export async function authenticateUser(
  authMode: "signin" | "signup",
  username: string,
  password: string,
) {
  const endpoint = authMode === "signin" ? "/user/signIn" : "/user/register";

  return requestAuth(endpoint, { username, password });
}

export async function createGuestUser() {
  return requestAuth("/user/guest");
}
