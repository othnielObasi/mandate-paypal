import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "../app/globals.css";

import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import Landing from "../app/page";
import AppLayout from "../app/app/layout";
import HomePage from "../app/app/page";
import SetupPage from "../app/app/setup/page";
import OrdersPage from "../app/app/orders/page";
import AssistantsPage from "../app/app/assistants/page";
import ReceiptsPage from "../app/app/receipts/page";
import SellerPage from "../app/seller/page";
import { RouterProvider, useRouterState } from "./router";
import { dispatch, installFetch, toUrl } from "./server";

installFetch();

const APP_PAGES: Record<string, () => React.ReactElement> = {
  "/app": HomePage,
  "/app/setup": SetupPage,
  "/app/orders": OrdersPage,
  "/app/assistants": AssistantsPage,
  "/app/receipts": ReceiptsPage,
};

const TITLES: Record<string, string> = {
  "/": "Mandate · Let AI shop for you, on your terms",
  "/app": "Your mandate · Mandate",
  "/app/setup": "Write your mandate · Mandate",
  "/app/orders": "Orders · Mandate",
  "/app/assistants": "Assistants · Mandate",
  "/app/receipts": "Receipts · Mandate",
  "/seller": "Seller check · Mandate",
};

/** Plain <a href="/…"> links (not next/link): route app paths in-page, open /api resources as files. */
function useLinkInterceptor() {
  const { navigate } = useRouterState();
  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return;
      e.preventDefault();
      if (!href.startsWith("/api/")) return navigate(href);
      const res = await dispatch(new Request(toUrl(href), { headers: { "x-forwarded-for": "127.0.0.1" } }));
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const name = a.getAttribute("download");
      if (name !== null) {
        const dl = Object.assign(document.createElement("a"), { href: url, download: name || "mandate.json" });
        document.body.appendChild(dl);
        dl.click();
        dl.remove();
      } else window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
}

function Screen() {
  const { pathname } = useRouterState();
  useLinkInterceptor();
  useEffect(() => {
    document.title = TITLES[pathname] ?? "Mandate";
  }, [pathname]);

  if (pathname === "/seller") return <SellerPage />;
  if (pathname.startsWith("/app")) {
    const Page = APP_PAGES[pathname] ?? HomePage;
    return (
      <AppLayout>
        <Page />
      </AppLayout>
    );
  }
  return <Landing />;
}

createRoot(document.getElementById("root")!).render(
  <RouterProvider initial="/">
    <Screen />
  </RouterProvider>,
);
