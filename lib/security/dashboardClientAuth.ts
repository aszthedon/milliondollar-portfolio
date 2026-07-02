"use client";

export const dashboardTokenStorageKey = "mdtp_dashboard_token";

export interface DashboardLoginResult {
  token: string;
  expires_at: string;
  message: string;
}

export function getDashboardToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(dashboardTokenStorageKey) ?? "";
}

export function setDashboardToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(dashboardTokenStorageKey, token);
}

export function clearDashboardToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(dashboardTokenStorageKey);
}

export function getDashboardAuthHeaders(): Record<string, string> {
  const token = getDashboardToken();

  if (!token) {
    return {};
  }

  return {
    "x-dashboard-token": token,
  };
}

function buildDashboardHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);

  const dashboardHeaders = getDashboardAuthHeaders();

  for (const [key, value] of Object.entries(dashboardHeaders)) {
    nextHeaders.set(key, value);
  }

  return nextHeaders;
}

export async function loginDashboard(password: string) {
  const response = await fetch("/api/dashboard/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Dashboard login failed.");
  }

  setDashboardToken(data.token);

  return data as DashboardLoginResult;
}

export async function verifyDashboardSession() {
  const response = await fetch("/api/dashboard/auth/verify", {
    method: "GET",
    headers: buildDashboardHeaders(),
  });

  if (!response.ok) {
    clearDashboardToken();
    return false;
  }

  return true;
}

export function logoutDashboard() {
  clearDashboardToken();

  return fetch("/api/dashboard/auth/login", {
    method: "DELETE",
  }).catch(() => null);
}

export async function dashboardFetchJson<T>({
  url,
  options,
}: {
  url: string;
  options?: RequestInit;
}) {
  const response = await fetch(url, {
    ...options,
    headers: buildDashboardHeaders(options?.headers),
  });

  if (response.status === 401) {
    clearDashboardToken();

    throw new Error(
      "Dashboard session expired. Please unlock the dashboard again."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Dashboard request failed.");
  }

  return data as T;
}

export function handleUnauthorizedDashboardResponse(response: Response) {
  if (response.status !== 401) {
    return false;
  }

  clearDashboardToken();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dashboard-auth-expired"));
  }

  return true;
}