import type { JSX } from "react";
import { EditorLoading } from "@/components/ui/editor-loading.tsx";
import { ACTIVITY_COPY } from "@/ui/copy/activities.ts";

export default function ActivityLoading(): JSX.Element {
  return <EditorLoading label={ACTIVITY_COPY.loading} />;
}
