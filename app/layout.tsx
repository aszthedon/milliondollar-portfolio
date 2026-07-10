import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";

import { getSiteName, getSiteSlugFromHost, getSiteUrlFallback } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

async function getHostScopedSiteSettings() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  const siteSlug = getSiteSlugFromHost(host);

  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("seo_title,seo_description,seo_keywords,seo_og_image_url,business_name,navbar_brand_text,primary_color,secondary_color,branding_settings,theme_settings,custom_css")
    .eq("site_slug", siteSlug)
    .maybeSingle();

  return { siteSlug, settings: data };
}

function getBrandingValue(branding: unknown, key: string, fallback: string) {
  if (!branding || typeof branding !== "object") return fallback;
  const value = (branding as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cssVars(settings: Record<string, unknown> | null | undefined): CSSProperties {
  const branding = settings?.branding_settings;
  const primaryColor = String(settings?.primary_color || getBrandingValue(branding, "primaryColor", "#ffffff"));
  const secondaryColor = String(settings?.secondary_color || getBrandingValue(branding, "secondaryColor", "#a1a1aa"));
  const accentColor = getBrandingValue(branding, "accentColor", primaryColor);
  const backgroundColor = getBrandingValue(branding, "backgroundColor", "#000000");
  const foregroundColor = getBrandingValue(branding, "foregroundColor", "#ffffff");

  return {
    "--site-primary-color": primaryColor,
    "--site-secondary-color": secondaryColor,
    "--site-accent-color": accentColor,
    "--site-background-color": backgroundColor,
    "--site-foreground-color": foregroundColor,
    "--background": backgroundColor,
    "--foreground": foregroundColor,
    backgroundColor,
    color: foregroundColor,
  } as CSSProperties;
}

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getHostScopedSiteSettings();
  const fallbackName = getSiteName();
  const fallbackUrl = getSiteUrlFallback();

  const title = settings?.seo_title || settings?.business_name || settings?.navbar_brand_text || fallbackName;
  const description = settings?.seo_description || "A polished booking website built for service brands, creatives, and entrepreneurs.";
  const keywords = String(settings?.seo_keywords ?? "").split(",").map((keyword) => keyword.trim()).filter(Boolean);
  const imageUrl = settings?.seo_og_image_url || undefined;

  return {
    title: { default: title, template: `%s | ${title}` },
    description,
    keywords,
    authors: [{ name: title }],
    creator: title,
    publisher: title,
    metadataBase: new URL(fallbackUrl),
    openGraph: { title, description, url: fallbackUrl, siteName: title, type: "website", locale: "en_US", images: imageUrl ? [imageUrl] : undefined },
    twitter: { card: "summary_large_image", title, description, images: imageUrl ? [imageUrl] : undefined },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { settings } = await getHostScopedSiteSettings();
  const customCss = typeof settings?.custom_css === "string" ? settings.custom_css : "";

  return (
    <html lang="en" suppressHydrationWarning style={cssVars(settings as Record<string, unknown> | null)}>
      <body className={inter.className} style={cssVars(settings as Record<string, unknown> | null)}>
        <style dangerouslySetInnerHTML={{ __html: `
          .site-primary-bg { background-color: var(--site-primary-color) !important; }
          .site-primary-text { color: var(--site-primary-color) !important; }
          .site-secondary-text { color: var(--site-secondary-color) !important; }
          .site-primary-border { border-color: color-mix(in srgb, var(--site-primary-color) 35%, transparent) !important; }
          ${customCss}
        ` }} />
        {children}
      </body>
    </html>
  );
}
