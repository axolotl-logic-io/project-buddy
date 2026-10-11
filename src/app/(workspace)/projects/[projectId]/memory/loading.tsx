import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function MemoryLoading(): JSX.Element {
  return <p>{COPY.memory.loading}</p>;
}
