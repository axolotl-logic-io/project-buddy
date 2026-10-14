import type { JSX, ReactNode } from "react";
import { SITE_COPY } from "@/ui/copy/site.ts";

// The frame of the pages a signed-out visitor sees: the sign-in page, the
// sign-up page and the page a sign-in link opens. A narrow panel in the
// middle of the page, under the site's name and the page's intro.
export function SignInPanel({
  intro,
  children,
}: {
  readonly intro: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="panel flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="site-title">{SITE_COPY.name}</h1>
          <p className="text-muted">{intro}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
