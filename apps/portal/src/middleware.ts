import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Consolidate to a single canonical host (www), matching every rel=canonical,
// the sitemaps and RSS (all derived from NEXT_PUBLIC_SITE_URL=https://www.fatonacional.com).
// The bare domain → www via a permanent redirect, so Google never sees duplicate
// content and internal links stay on one host. /cms IS redirected too, so the Payload
// admin always runs on the canonical host (matching serverURL/cors/csrf). Only /api and
// static assets are excluded, so the API still answers on any host.
const CANONICAL_HOST = "www.fatonacional.com";
const BARE_HOST = "fatonacional.com";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();

  if (host === BARE_HOST) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|icon.svg|.*\\.xml|robots.txt).*)"],
};
