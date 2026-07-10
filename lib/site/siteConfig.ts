export const defaultSiteSlug = "mdtp";

const domainSiteSlugMap: Record<string, string> = {
  "iyanlafixmycrown.com": "fix-my-crown",
  "www.iyanlafixmycrown.com": "fix-my-crown",
};

export function normalizeSiteSlug(value: string | undefined | null) {
  const cleanValue = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  return cleanValue || defaultSiteSlug;
}

export function cleanHostname(value: string | undefined | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .replace(/^www\./, "");
}

export function getSiteSlugFromHostname(hostname: string | undefined | null) {
  const hostnameValue = cleanHostname(hostname);

  if (!hostnameValue) return "";

  return domainSiteSlugMap[hostnameValue] || domainSiteSlugMap[`www.${hostnameValue}`] || "";
}

export function getSiteSlugFromHost(hostname: string | undefined | null) {
  return normalizeSiteSlug(getSiteSlugFromHostname(hostname) || process.env.SITE_SLUG || process.env.NEXT_PUBLIC_SITE_SLUG);
}

function getRequestHostname(request: Request | undefined) {
  if (!request) return "";

  return request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
}

export function getServerSiteSlug(request?: Request) {
  const requestSlug = getSiteSlugFromHostname(getRequestHostname(request));

  if (requestSlug) return normalizeSiteSlug(requestSlug);

  return normalizeSiteSlug(process.env.SITE_SLUG || process.env.NEXT_PUBLIC_SITE_SLUG);
}

export function getClientSiteSlug() {
  if (typeof window !== "undefined") {
    const hostnameSlug = getSiteSlugFromHostname(window.location.hostname);

    if (hostnameSlug) return normalizeSiteSlug(hostnameSlug);
  }

  return normalizeSiteSlug(process.env.NEXT_PUBLIC_SITE_SLUG);
}

export function getSiteName() {
  return process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || "Million Dollar Ticket Productions";
}

export function getSiteUrlFallback() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
