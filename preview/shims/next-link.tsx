"use client";

import { forwardRef } from "react";
import { useRouterState } from "../router";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; prefetch?: boolean; replace?: boolean; scroll?: boolean };

/** next/link for the standalone preview: same markup, in-memory navigation. */
const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, replace, scroll: _s, onClick, ...rest }, ref) {
  const { navigate } = useRouterState();
  return (
    <a
      ref={ref}
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || rest.target === "_blank") return;
        e.preventDefault();
        navigate(href, { replace });
      }}
    />
  );
});

export default Link;
