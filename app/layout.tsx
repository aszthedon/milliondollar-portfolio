import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { getServerSiteSlug, getSiteName, getSiteUrlFallback } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const siteSlug = getServerSiteSlug();
  const fallbackName = getSiteName();
  const fallbackUrl = getSiteUrlFallback();

  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("seo_title,seo_description,seo_keywords,seo_og_image_url,business_name,navbar_brand_text")
    .eq("site_slug", siteSlug)
    .maybeSingle();

  const title = data?.seo_title || data?.business_name || data?.navbar_brand_text || fallbackName;
  const description =
    data?.seo_description ||
    "A polished booking website built for service brands, creatives, and entrepreneurs.";
  const keywords = String(data?.seo_keywords ?? "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const imageUrl = data?.seo_og_image_url || undefined;

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords,
    authors: [{ name: title }],
    creator: title,
    publisher: title,
    metadataBase: new URL(fallbackUrl),
    openGraph: {
      title,
      description,
      url: fallbackUrl,
      siteName: title,
      type: "website",
      locale: "en_US",
      images: imageUrl ? [imageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
