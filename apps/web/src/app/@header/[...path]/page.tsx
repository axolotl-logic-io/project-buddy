import type { JSX } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { headerBreadcrumbs } from "@/components/header-breadcrumbs.ts";
import { SignedInLinks } from "@/components/site-header.tsx";

// The header links, and the trail band whose last item is the page's
// heading, for each page.
export default async function HeaderLinks({
  params,
}: PageProps<"/[...path]">): Promise<JSX.Element> {
  const { path } = await params;
  const user = await currentUser();
  let breadcrumbs: readonly Breadcrumb[] = [];
  if (user !== undefined) {
    breadcrumbs = await headerBreadcrumbs(user, path);
  }
  return SignedInLinks({ breadcrumbs });
}
