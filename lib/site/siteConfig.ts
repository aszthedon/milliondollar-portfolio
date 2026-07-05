export const defaultSiteSlug = "mdtp";

const domainSiteSlugMap: Record<string, string> = {
  "iyanlafixmycrown.com": "fix-my-crown",
  "www.iyanlafixmycrown.com": "fix-my-crown",
};

function normalizeSiteSlug(value: string | undefined | null) {
  const cleanValue = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  return cleanValue || defaultSiteSlug;
}

function resolveSiteSlugFromHostname(hostname: string | undefined | null) {
  const cleanHostname = String(hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");

  if (!cleanHostname) {
    return "";
  }

  return domainSiteSlugMap[cleanHostname] || domainSiteSlugMap[`www.${cleanHostname}`] || "";
}

export function getServerSiteSlug() {
  return normalizeSiteSlug(
    process.env.SITE_SLUG || process.env.NEXT_PUBLIC_SITE_SLUG
  );
}

export function getClientSiteSlug() {
  if (typeof window !== "undefined") {
    const hostnameSlug = resolveSiteSlugFromHostname(window.location.hostname);

    if (hostnameSlug) {
      return normalizeSiteSlug(hostnameSlug);
    }
  }

  return normalizeSiteSlug(process.env.NEXT_PUBLIC_SITE_SLUG);
}

export function getSiteName() {
  return (
    process.env.NEXT_PUBLIC_SITE_NAME ||
    process.env.SITE_NAME ||
    "Million Dollar Ticket Productions"
  );
}

export function getSiteUrlFallback() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
