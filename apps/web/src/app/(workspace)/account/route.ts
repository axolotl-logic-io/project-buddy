import { NextResponse } from "next/server";

// Saved Account links and old Stripe returns keep their query and reach Settings.
function GET(request: Request): Response {
  const destination = new URL(request.url);
  destination.pathname = "/settings";
  const section = destination.searchParams.get("section");
  if (section === "batteries" || section === "security") {
    destination.hash = section;
  }
  if (destination.searchParams.has("battery")) {
    destination.hash = "buy-batteries";
  }
  return NextResponse.redirect(destination);
}

export { GET };
