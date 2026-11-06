import type { Metadata, Viewport } from "next";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute URLs for the share image. Override with NEXT_PUBLIC_SITE_URL on another host.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mandate-e13m.onrender.com"),
  title: { default: "Mandate · Your AI can shop. It can't cross the line.", template: "%s · Mandate" },
  description:
    "Mandate turns one sentence into signed spending rules that every AI agent must obey, then pays with PayPal only when the rules say yes. Every step is signed and provable.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Crect x='1' y='1' width='26' height='26' rx='8' fill='%231E40AF'/%3E%3Cpath d='M8 14.5l4 4 8-9' stroke='white' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
  openGraph: {
    title: "Mandate · Your AI can shop. It can't cross the line.",
    description: "Signed spending rules for AI agents, enforced before PayPal moves a cent.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1120" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
