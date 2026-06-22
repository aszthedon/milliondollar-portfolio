import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Million Dollar Ticket Productions",
    template: "%s | Million Dollar Ticket Productions",
  },
  description:
    "A multimedia production, booking, branding, and creative services platform built for service brands, creatives, and entrepreneurs.",
  keywords: [
    "booking website",
    "creative services",
    "multimedia production",
    "branding",
    "appointment booking",
    "client portal",
    "Million Dollar Ticket Productions",
  ],
  authors: [
    {
      name: "Million Dollar Ticket Productions",
    },
  ],
  creator: "Million Dollar Ticket Productions",
  publisher: "Million Dollar Ticket Productions",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"
  ),
  openGraph: {
    title: "Million Dollar Ticket Productions",
    description:
      "A multimedia production, booking, branding, and creative services platform built for service brands, creatives, and entrepreneurs.",
    url:
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000",
    siteName: "Million Dollar Ticket Productions",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Million Dollar Ticket Productions",
    description:
      "A multimedia production, booking, branding, and creative services platform built for service brands, creatives, and entrepreneurs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}