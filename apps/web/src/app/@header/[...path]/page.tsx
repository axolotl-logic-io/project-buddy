import type { JSX } from "react";
import { SignedInLinks } from "@/components/site-header.tsx";
import { placeOf } from "@/home/places.ts";

// The header's links on every page but the root, with the map's place the
// page belongs to.
export default async function HeaderLinks({
  params,
}: PageProps<"/[...path]">): Promise<JSX.Element> {
  const { path } = await params;
  return <SignedInLinks place={placeOf(path)?.name} />;
}
