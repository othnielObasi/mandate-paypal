import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "mandate_session"; // same name as lib/server/session.ts (that file needs Node; this runs at the edge)

/** Opening the app gives this browser its own private workspace, if it doesn't have one yet. */
export function middleware(req: NextRequest) {
  if (req.cookies.get(COOKIE)) return NextResponse.next();
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  // Set it on the request too, so this first page render already sees it.
  req.cookies.set(COOKIE, secret);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export const config = { matcher: ["/app", "/app/:path*"] };
