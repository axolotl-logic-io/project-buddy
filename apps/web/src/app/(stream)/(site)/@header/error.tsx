"use client";

import type { JSX } from "react";
import { SiteHeader } from "@/components/site-header.tsx";

// Keep public navigation available when the session cannot be read.
export default function HeaderError(): JSX.Element {
  return <SiteHeader />;
}
