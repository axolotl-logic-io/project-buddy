import { startChatAction } from "@/app/chats/actions";
import { DEFAULT_PERSONA_ID, listPersonas } from "@/personas";
import type { Project } from "@/projects/store";

export function NewChatForm({
  projects,
  selectedProjectId,
}: {
  projects: Project[];
  selectedProjectId?: string | undefined;
}) {
  return (
    <form action={startChatAction} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="font-medium">Project</span>
        <select
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700"
          defaultValue={selectedProjectId}
          name="projectId"
          required
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Persona</legend>
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
        className="self-start rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        type="submit"
      >
        Start chat
      </button>
    </form>
  );
}
