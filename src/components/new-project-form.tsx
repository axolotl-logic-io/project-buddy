import { createProjectAction } from "@/app/projects/actions";

export function NewProjectForm() {
  return (
    <form action={createProjectAction} className="flex items-end gap-2">
      <label className="flex flex-1 flex-col gap-1">
        <span className="font-medium">Project name</span>
        <input
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700"
          name="name"
          required
          type="text"
        />
      </label>
      <button
        className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        type="submit"
      >
        Create project
      </button>
    </form>
  );
}
