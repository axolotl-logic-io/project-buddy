import type { JSX } from "react";
import { SignedInLinks } from "@/components/site-header.tsx";

// The header's links where no other slot page matches, as on the not-found
// page of an address the site doesn't have: the same menu and shortcuts as
// on every other page, for a visitor or a signed-in user.
export default function DefaultHeaderLinks(): Promise<JSX.Element> {
  return SignedInLinks();
}
