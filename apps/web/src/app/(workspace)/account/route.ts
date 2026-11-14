import { NextResponse } from "next/server";

// Account links lead to Settings.
function GET(request: Request): Response {
  const destination = new URL(request.url);
  destination.pathname = "/settings";
  const section = destination.searchParams.get("section");
  if (section === "security") {
    destination.hash = section;
  }
  return NextResponse.redirect(destination);
}

export { GET };
