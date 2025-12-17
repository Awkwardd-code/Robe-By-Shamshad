import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const AUTH_COOKIE_NAME = "rbs_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AuthTokenPayload extends JWTPayload {
  id: string;
  email: string;
  name: string;
  sessionToken: string;
  role?: string;
  isAdmin?: number;
}

const getSecretKey = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
};

export async function createAuthToken(payload: AuthTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as AuthTokenPayload;
  } catch (error) {
    console.warn("Failed to verify auth token:", error);
    return null;
  }
}

export const AUTH_COOKIE_OPTIONS = {
  name: AUTH_COOKIE_NAME,
  maxAge: TOKEN_TTL_SECONDS,
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};
