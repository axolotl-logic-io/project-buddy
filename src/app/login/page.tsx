import type { Metadata } from "next";
import type { JSX } from "react";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

export const metadata: Metadata = {
  title: LOGIN_COPY.title,
};

// The sign-in page. Sign-in is by a link sent by email, which is not built
// yet, so for now the page only says so.
export default function LoginPage(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="panel flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="site-title">{SITE_COPY.name}</h1>
          <p className="text-muted">{LOGIN_COPY.intro}</p>
        </div>
        <p>{LOGIN_COPY.comingSoon}</p>
      </div>
    </div>
  );
}
