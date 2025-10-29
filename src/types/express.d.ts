import "express";

declare global {
  namespace Express {
    interface User {
      userId: string;
      guard: string;
      role: string;
    }

    interface Request {
      user?: User;
    }
  }
}
