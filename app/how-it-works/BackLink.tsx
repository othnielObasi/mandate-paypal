"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";

/** Back to wherever you came from on this site (the landing page or the app); home otherwise. */
export function BackLink() {
  const router = useRouter();
  return (
    <NextLink
      href="/"
      className="mm-back"
      onClick={(e) => {
        let fromHere = false;
        try {
          fromHere = !!document.referrer && new URL(document.referrer).origin === location.origin;
        } catch {}
        if (fromHere && history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      ← Back
    </NextLink>
  );
}
