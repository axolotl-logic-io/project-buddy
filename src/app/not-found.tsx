import Link from "next/link";
import type { JSX } from "react";
import { userMessageForCase } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

// What a missing project or chat, or an address the site doesn't have,
// shows: the not-found case's message and a way back to the projects.
export default function NotFound(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="page-heading">{COPY.problems.notFoundHeading}</h1>
      <p>{userMessageForCase("not-found")}</p>
      <Link className="self-start text-link" href="/projects">
        {COPY.problems.projectsLink}
      </Link>
    </div>
  );
}
