import type { JSX } from "react";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
export default function Loading(): JSX.Element {
  return <p className="text-muted">{RETIREMENT_COPY.loading}</p>;
}
