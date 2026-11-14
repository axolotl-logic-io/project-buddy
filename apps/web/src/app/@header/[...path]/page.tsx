import type { JSX } from "react";
import { HeaderLinksAt } from "@/components/header-links.tsx";

// Resolve the catch-all header for detail and public routes.
export default async function HeaderLinks({
  params,
}: PageProps<"/[...path]">): Promise<JSX.Element> {
  const { path } = await params;
  return HeaderLinksAt({ path });
}
