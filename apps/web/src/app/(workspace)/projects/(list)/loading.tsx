import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export default function ProjectListLoading(): JSX.Element {
  return <LoadingSkeleton label={PROJECTS_COPY.loading} shapes={["cards"]} />;
}
