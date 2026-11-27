"use client";

import type { JSX } from "react";
import { PageHeader } from "@/components/page-header.tsx";

// Keep public navigation available when the session cannot be read.
export default function HeaderError(): JSX.Element {
  return <PageHeader />;
}
