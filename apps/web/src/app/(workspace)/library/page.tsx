import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { LibraryIndex } from "@/library/library.tsx";
import { LIBRARY_COPY } from "@/ui/copy/library.ts";

const metadata: Metadata = { title: LIBRARY_COPY.title };

async function LibraryPage(): Promise<JSX.Element> {
  await requireUser();
  return <LibraryIndex />;
}

export { metadata };
export default LibraryPage;
