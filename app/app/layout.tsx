import type { Metadata } from "next";
import { AppShell } from "./shell";
import { StoreProvider } from "./store";

export const metadata: Metadata = { title: "Your mandate" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
