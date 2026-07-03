export const defaultSiteSlug = "mdtp";

function normalizeSiteSlug(value: string | undefined | null) {
  const cleanValue = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  return cleanValue || defaultSiteSlug;
}

export function getServerSiteSlug() {
  return normalizeSiteSlug(
    process.env.SITE_SLUG || process.env.NEXT_PUBLIC_SITE_SLUG
  );
}

export function getClientSiteSlug() {
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
