import type { Route } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { Icon } from "@/components/ui/icon.tsx";

// The link above a page's heading, back to the page it sits under, such as
// a chat's project. Its accessible name is children alone; the arrow is
// decoration.
export function BackLink({
  href,
  children,
}: {
  readonly href: Route;
  readonly children: string;
}): JSX.Element {
  return (
    <Link className="back-link" href={href}>
      <Icon name="arrow-left" />
      <span>{children}</span>
    </Link>
  );
}
