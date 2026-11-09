import type { JSX } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { headerBreadcrumbs } from "@/components/header-breadcrumbs.ts";
import { SignedInLinks } from "@/components/site-header.tsx";
import { placeOf } from "@/home/places.ts";

// The header's links on every page but the root, with the map's place the
// page belongs to.
export default async function HeaderLinks({
  params,
}: PageProps<"/[...path]">): Promise<JSX.Element> {
  const { path } = await params;
  const user = await currentUser();
  let breadcrumbs: readonly Breadcrumb[] = [];
  if (user !== undefined) {
    breadcrumbs = await headerBreadcrumbs(user.id, path);
  }
  return SignedInLinks({ breadcrumbs, place: placeOf(path)?.name });
}
