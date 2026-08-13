declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: number;
      username: string;
      bio: string | null;
      avatarUrl: string | null;
      rating: number;
      gamesPlayed: number;
      createdAt: Date;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
