import Link from "next/link";
import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function Home(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="site-title">{COPY.site.name}</h1>
      <p className="max-w-md text-lg text-muted">{COPY.site.tagline}</p>
      <Link className="text-link" href="/projects">
        {COPY.home.projectsLink}
      </Link>
    </div>
  );
}
