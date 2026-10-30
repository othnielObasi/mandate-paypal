"use client";

import { useMemo } from "react";
import { useRouterState } from "../router";

export function usePathname(): string {
  return useRouterState().pathname;
}

export function useSearchParams(): URLSearchParams {
  const { search } = useRouterState();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useRouter() {
  const r = useRouterState();
  return useMemo(
    () => ({
      push: (href: string) => r.navigate(href),
      replace: (href: string) => r.navigate(href, { replace: true }),
      back: () => r.back(),
      forward: () => undefined,
      refresh: () => undefined,
      prefetch: () => undefined,
    }),
    [r],
  );
}

export function redirect(href: string): never {
  throw new Error(`redirect(${href}) is not supported in the preview`);
}

export function notFound(): never {
  throw new Error("Not found");
}
