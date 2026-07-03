declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: number;
      username: string;
      createdAt: Date;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
