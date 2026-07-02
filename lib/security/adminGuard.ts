import crypto from "crypto";
import { NextResponse } from "next/server";

const DASHBOARD_TOKEN_COOKIE = "mdtp_dashboard_token";
const DASHBOARD_TOKEN_HEADER = "x-dashboard-token";

interface DashboardTokenPayload {
  iat: number;
  exp: number;
  purpose: "dashboard_admin";
}

function getAdminPassword() {
  return (
    process.env.DASHBOARD_PASSWORD ||
    process.env.ADMIN_DASHBOARD_PASSWORD ||
    process.env.DASHBOARD_ADMIN_PASSWORD ||
    ""
  );
}

function getSessionSecret() {
  return (
    process.env.DASHBOARD_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CRON_SECRET ||
    getAdminPassword()
  );
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createDashboardToken({
  expiresInSeconds = 60 * 60 * 12,
}: {
  expiresInSeconds?: number;
} = {}) {
  const now = Math.floor(Date.now() / 1000);

  const payload: DashboardTokenPayload = {
    iat: now,
    exp: now + expiresInSeconds,
    purpose: "dashboard_admin",
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyDashboardToken(token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && safeCompare(token, cronSecret)) {
    return true;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);

  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as DashboardTokenPayload;

    if (payload.purpose !== "dashboard_admin") {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    return payload.exp > now;
  } catch {
    return false;
  }
}

export function verifyDashboardPassword(password: string) {
  const adminPassword = getAdminPassword();

  if (!adminPassword || !password) {
    return false;
  }

  return safeCompare(password, adminPassword);
}

export function getDashboardTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const headerToken = request.headers.get(DASHBOARD_TOKEN_HEADER);
  const cookieHeader = request.headers.get("cookie") ?? "";

  if (authorization?.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "").trim();
  }

  if (headerToken) {
    return headerToken.trim();
  }

  const cookieToken = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${DASHBOARD_TOKEN_COOKIE}=`));

  if (cookieToken) {
    return decodeURIComponent(cookieToken.split("=")[1] ?? "");
  }

  return null;
}

export function requireAdminRequest(request: Request) {
  const token = getDashboardTokenFromRequest(request);

  if (verifyDashboardToken(token)) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Unauthorized dashboard request.",
    },
    {
      status: 401,
    }
  );
}

export function getDashboardAuthCookie(token: string) {
  const secure = process.env.NODE_ENV === "production";

  return `${DASHBOARD_TOKEN_COOKIE}=${encodeURIComponent(
    token
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}; ${
    secure ? "Secure;" : ""
  }`;
}

export function getDashboardClearCookie() {
  const secure = process.env.NODE_ENV === "production";

  return `${DASHBOARD_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${
    secure ? "Secure;" : ""
  }`;
}

export function getClientIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function hashAdminIdentifier(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const dashboardTokenStorageKey = "mdtp_dashboard_token";
export const dashboardTokenCookieName = DASHBOARD_TOKEN_COOKIE;
export const dashboardTokenHeaderName = DASHBOARD_TOKEN_HEADER;

export function getAdminSessionCookieName() {
  return dashboardTokenCookieName;
}

export function getAdminSessionHeaderName() {
  return dashboardTokenHeaderName;
}