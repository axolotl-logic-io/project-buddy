import type { JSX } from "react";
import { EditorLoading } from "@/components/ui/editor-loading.tsx";
import { CONSTRUCT_COPY } from "@/ui/copy/constructs.ts";

export default function ConstructLoading(): JSX.Element {
  return <EditorLoading label={CONSTRUCT_COPY.loading} />;
}
