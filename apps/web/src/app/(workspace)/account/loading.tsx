import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

export default function AccountLoading(): JSX.Element {
  return <LoadingSkeleton label={ACCOUNT_COPY.loading} shapes={["panel"]} />;
}
