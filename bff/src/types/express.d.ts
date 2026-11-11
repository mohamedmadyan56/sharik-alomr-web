import 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        tokenHash: string;
      };
      admin?: {
        adminId: string;
        sessionId: string;
        permissions: Set<string>;
        roles: string[];
      };
    }
  }
}

export {};
