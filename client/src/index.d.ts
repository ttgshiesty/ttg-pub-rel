import { User as PassportUser } from 'passport';

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
    }

    interface Request {
      appKey?: string;
      userKey?: string;
    }
  }
}

export {};
