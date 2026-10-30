import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seller check", description: "Check that an AI agent's PayPal payment is backed by the customer's signed mandate before you ship." };

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
