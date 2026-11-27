import type { JSX } from "react";
import HeaderLinks from "@/app/(stream)/(site)/@header/[...path]/page.tsx";

// The page header at path, as the shared layout renders it with the
// @header slot. The slot reads the session, the balance and the stores the trail's
// names come from, so a test that uses this mocks them.
function siteHeaderAt(path: readonly string[]): Promise<JSX.Element> {
  return HeaderLinks({
    params: Promise.resolve({ path: [...path] }),
    searchParams: Promise.resolve({}),
  });
}

export { siteHeaderAt };
