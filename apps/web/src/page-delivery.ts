import { type NextRequest, NextResponse } from "next/server";

const PAGE_ADDRESS_HEADER = "x-pb-page-address";
const COMPLETE_PAGE_PATH = "/complete-page";
const COMPLETE_ROUTE_PREFIX = "/document";
const COMPLETE_PAGE_COOKIE = "pb-complete-page";

function completePageAddress(address: string): string {
  return `${COMPLETE_PAGE_PATH}?${new URLSearchParams({ next: address })}`;
}

function completePageResponse(request: NextRequest): NextResponse {
  const next = request.nextUrl.searchParams.get("next");
  const destination = new URL("/", request.url);
  const target = URL.parse(next ?? "/", destination);
  let address = destination;
  if (
    target?.origin === destination.origin &&
    target.pathname !== COMPLETE_PAGE_PATH
  ) {
    address = target;
  }
  const response = NextResponse.redirect(address);
  response.headers.set("cache-control", "private, no-store");
  response.cookies.set(COMPLETE_PAGE_COOKIE, "true", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

// The access gate runs before either rendering path. The original URL is
// where links and native forms navigate, including after a rewrite.
function deliverPage(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set(PAGE_ADDRESS_HEADER, `${pathname}${search}`);
  if (request.cookies.get(COMPLETE_PAGE_COOKIE)?.value === "true") {
    const destination = request.nextUrl.clone();
    destination.pathname = COMPLETE_ROUTE_PREFIX;
    if (pathname !== "/") {
      destination.pathname += pathname;
    }
    return NextResponse.rewrite(destination, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export {
  COMPLETE_PAGE_PATH,
  COMPLETE_ROUTE_PREFIX,
  completePageAddress,
  completePageResponse,
  deliverPage,
  PAGE_ADDRESS_HEADER,
};
