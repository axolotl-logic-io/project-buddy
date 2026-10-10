import Link from "next/link";
import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function Home(): JSX.Element {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-semibold text-4xl tracking-tight">
        {COPY.site.name}
      </h1>
      <p className="max-w-md text-lg text-muted">{COPY.site.tagline}</p>
      <Link className="underline underline-offset-2" href="/projects">
        {COPY.home.projectsLink}
      </Link>
    </main>
  );
}
