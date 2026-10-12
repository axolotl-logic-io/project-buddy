import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

// What a missing project or chat, or an address the site doesn't have,
// shows: the not-found case's message and a way back to the projects.
export default function NotFound(): JSX.Element {
  return (
    <div className="page-column">
      <div className="panel flex flex-col items-start gap-4">
        <h1 className="page-heading">{COPY.problems.notFoundHeading}</h1>
        <p>{userMessage("not-found")}</p>
        <Button asChild={true} variant="secondary">
          <Link href="/projects">{COPY.problems.projectsLink}</Link>
        </Button>
      </div>
    </div>
  );
}
