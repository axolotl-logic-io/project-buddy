import type { JSX } from "react";
import { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import { COPY } from "@/ui/copy.ts";

export function NewProjectForm(): JSX.Element {
  return (
    <form action={createProjectAction} className="flex items-end gap-2">
      <label className="flex flex-1 flex-col gap-1">
        <span className="font-medium">{COPY.projects.nameLabel}</span>
        <input
          className="rounded border border-line px-2 py-1"
          name="name"
          required={true}
          type="text"
        />
      </label>
      <button className="button-primary" type="submit">
        {COPY.projects.create}
      </button>
    </form>
  );
}
