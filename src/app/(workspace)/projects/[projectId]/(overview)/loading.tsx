import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function ProjectLoading(): JSX.Element {
  return <p>{COPY.project.loading}</p>;
}
