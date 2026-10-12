import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { COPY } from "@/ui/copy.ts";

export default function ProjectListLoading(): JSX.Element {
  return <LoadingSkeleton label={COPY.projects.loading} shapes={["cards"]} />;
}
