"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * A tiny in-memory router for the standalone preview. It keeps the URL in
 * React state rather than browser history, so the file works anywhere it is
 * opened (a local file, a sandboxed preview frame) with no server.
 */
type Loc = { pathname: string; search: string };
type RouterCtx = Loc & { navigate: (href: string, opts?: { replace?: boolean }) => void; back: () => void };

const Ctx = createContext<RouterCtx | null>(null);

export function useRouterState(): RouterCtx {
  const r = useContext(Ctx);
  if (!r) throw new Error("Router missing");
  return r;
}

function parse(href: string, from: Loc): Loc & { hash: string } {
  const u = new URL(href, `https://preview.local${from.pathname}${from.search}`);
  return { pathname: u.pathname.replace(/\/$/, "") || "/", search: u.search, hash: u.hash };
}

export function RouterProvider({ initial, children }: { initial: string; children: React.ReactNode }) {
  const [stack, setStack] = useState<Loc[]>(() => [parse(initial, { pathname: "/", search: "" })]);
  const loc = stack[stack.length - 1]!;

  const navigate = useCallback((href: string, opts?: { replace?: boolean }) => {
    setStack((s) => {
      const cur = s[s.length - 1]!;
      const next = parse(href, cur);
      if (next.pathname === cur.pathname && next.search === cur.search && next.hash) {
        document.getElementById(next.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
        return s;
      }
      requestAnimationFrame(() => {
        if (next.hash) document.getElementById(next.hash.slice(1))?.scrollIntoView();
        else window.scrollTo(0, 0);
      });
      const entry = { pathname: next.pathname, search: next.search };
      return opts?.replace ? [...s.slice(0, -1), entry] : [...s, entry];
    });
  }, []);

  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const value = useMemo(() => ({ ...loc, navigate, back }), [loc, navigate, back]);

  useEffect(() => {
    const title = document.title;
    return () => void (document.title = title);
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
