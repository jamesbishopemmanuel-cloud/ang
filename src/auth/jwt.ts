import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthToken {
  userId: string;
  phone: string;
}

export function createToken(payload: AuthToken): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "30d"
  });
}

export function verifyToken(token: string): AuthToken {
  return jwt.verify(
    token,
    env.JWT_SECRET
  ) as AuthToken;
}