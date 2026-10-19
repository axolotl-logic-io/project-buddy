import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import type { ProjectId } from "@/ids.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

interface ChatProjectFilterProps {
  // The caller supplies only projects belonging to the current user.
  readonly projects: readonly {
    readonly id: ProjectId;
    readonly name: string;
  }[];
  readonly selectedProjectId?: ProjectId | undefined;
}

// Offers already-owned projects in supplied order. Missing or unknown
// selections show All; submitting uses the browser's GET navigation.
function ChatProjectFilter({
  projects,
  selectedProjectId,
}: ChatProjectFilterProps): JSX.Element {
  const selected = projects.find((project) => project.id === selectedProjectId);
  return (
    <form
      action="/chat"
      className="flex flex-wrap items-end gap-3"
      method="get"
    >
      <div className="min-w-0 flex-1">
        <SelectField
          className="min-h-(--target-size) truncate"
          defaultValue={selected?.id ?? ""}
          label={STANDALONE_CHATS_COPY.projectFilterLabel}
          name="project"
        >
          <option value="">{STANDALONE_CHATS_COPY.allProjects}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </SelectField>
      </div>
      <Button type="submit" variant="secondary">
        {STANDALONE_CHATS_COPY.showChats}
      </Button>
    </form>
  );
}

export { ChatProjectFilter };
