"use client";

import type { JSX } from "react";
import { SiteMenu } from "@/components/site-menu.tsx";

// Keep public navigation available when the session cannot be read.
export default function HeaderLinksError(): JSX.Element {
  return <SiteMenu links={null} />;
}
