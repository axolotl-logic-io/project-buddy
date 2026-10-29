"use client";

import { type ChangeEvent, type JSX, useState } from "react";
import type { FoundChat } from "@/chats/chat-rows.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import type { ProjectId } from "@/ids.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

interface ChatProjectFilterProps {
  // The caller supplies only projects and chats belonging to the current user.
  readonly projects: readonly {
    readonly id: ProjectId;
    readonly name: string;
  }[];
  readonly chats: readonly FoundChat[];
  readonly selectedProjectId?: ProjectId | undefined;
}

function changeProject(
  selectProject: (value: string) => void,
  event: ChangeEvent<HTMLSelectElement>,
): void {
  const { value } = event.currentTarget;
  const url = new URL(globalThis.location.href);
  if (value === "") {
    url.searchParams.delete("project");
  } else {
    url.searchParams.set("project", value);
  }
  globalThis.history.replaceState(null, "", url);
  selectProject(value);
}

// Filters the complete owned list locally, preserving its supplied order.
// The initial selection also applies during server rendering.
function ChatProjectFilter({
  projects,
  chats,
  selectedProjectId,
}: ChatProjectFilterProps): JSX.Element {
  const [projectId, selectProject] = useState(selectedProjectId ?? "");
  const onChange = changeProject.bind(null, selectProject);
  const selected = projects.find((project) => project.id === projectId);
  let visibleChats = chats;
  if (selected !== undefined) {
    visibleChats = chats.filter(
      (chat) => chat.kind === "project" && chat.projectId === selected.id,
    );
  }
  return (
    <>
      <SelectField
        className="min-h-(--target-size) truncate"
        value={selected?.id ?? ""}
        onChange={onChange}
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
      <ChatList
        chats={visibleChats}
        emptyMessage={STANDALONE_CHATS_COPY.noChats}
        showProjectNames={true}
      />
    </>
  );
}

export { ChatProjectFilter };
