import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { HOME_COPY, SITE_COPY } from "@/ui/copy/site.ts";

export default function Home(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="panel flex w-full max-w-xl flex-col items-center gap-5 text-center">
        <h1 className="site-title">{SITE_COPY.name}</h1>
        <p className="max-w-md text-lg text-muted">{SITE_COPY.tagline}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild={true}>
            <Link href="/projects">{HOME_COPY.projectsLink}</Link>
          </Button>
          <Button asChild={true}>
            <Link href="/chat">{HOME_COPY.chatLink}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
