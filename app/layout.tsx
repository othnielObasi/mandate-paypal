import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mandate — let an AI spend, within your rules",
  description: "A governed buying agent on PayPal. The agent shops; a deterministic gate decides; every action is signed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
