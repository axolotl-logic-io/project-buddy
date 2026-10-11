import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { COPY } from "@/ui/copy.ts";

export default function Home(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="panel flex w-full max-w-xl flex-col items-center gap-5 text-center">
        <h1 className="site-title">{COPY.site.name}</h1>
        <p className="max-w-md text-lg text-muted">{COPY.site.tagline}</p>
        <Button asChild={true}>
          <Link href="/projects">{COPY.home.projectsLink}</Link>
        </Button>
      </div>
    </div>
  );
}
