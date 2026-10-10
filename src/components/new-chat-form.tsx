import type { JSX } from "react";
import { startChatAction } from "@/app/chats/actions.ts";
import { DEFAULT_PERSONA_ID, listPersonas } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

export function NewChatForm({
  projects,
  selectedProjectId,
}: {
  projects: Project[];
  selectedProjectId?: string | undefined;
}): JSX.Element {
  return (
    <form action={startChatAction} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="font-medium">{COPY.newChat.projectLabel}</span>
        <select
          className="rounded border border-line px-2 py-1"
          defaultValue={selectedProjectId}
          name="projectId"
          required={true}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">
          {COPY.newChat.personaLabel}
        </legend>
        {listPersonas().map((persona) => (
          <label className="flex items-center gap-2" key={persona.id}>
            <input
              defaultChecked={persona.id === DEFAULT_PERSONA_ID}
              name="personaId"
              type="radio"
              value={persona.id}
            />
            {persona.name}
          </label>
        ))}
      </fieldset>
      <button
        className="self-start rounded bg-primary px-4 py-2 text-on-primary"
        type="submit"
      >
        {COPY.newChat.start}
      </button>
    </form>
  );
}
