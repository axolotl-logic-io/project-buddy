import { headers } from "next/headers";
import type { JSX, ReactNode } from "react";
import { HeaderLinksAt } from "@/components/header-links.tsx";
import { PAGE_ADDRESS_HEADER } from "@/page-delivery.ts";
import SiteLayout from "../(stream)/(site)/layout.tsx";

// The route directories here link to the site's pages and actions. This
// layout gives those same entry points a complete HTML response outside
// the streaming boundary when the browser cannot run its reveal script.
export default async function DocumentLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<JSX.Element> {
  const address = (await headers()).get(PAGE_ADDRESS_HEADER) ?? "/";
  const [pathname = ""] = address.split("?");
  const path = pathname.split("/").filter(Boolean);
  return (
    <SiteLayout header={<HeaderLinksAt path={path} />}>{children}</SiteLayout>
  );
}
