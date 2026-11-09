"use client";

import { type ChangeEvent, type JSX, useState } from "react";
import type { Chat } from "@/chats/chat-rows.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import type { ProjectId } from "@/ids.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

interface ChatProjectFilterProps {
  // The caller supplies only projects and chats belonging to the current user.
  readonly workspace?: boolean;
  readonly projects: readonly {
    readonly id: ProjectId;
    readonly name: string;
  }[];
  readonly chats: readonly Chat[];
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
  workspace = false,
}: ChatProjectFilterProps): JSX.Element {
  const [projectId, selectProject] = useState(selectedProjectId ?? "");
  const onChange = changeProject.bind(null, selectProject);
  const selected = projects.find((project) => project.id === projectId);
  let visibleChats = chats;
  if (selected !== undefined) {
    visibleChats = chats.filter((chat) => chat.project?.id === selected.id);
  }
  const filter = (
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
    </>
  );
  if (workspace === true) {
    return (
      <WorkspaceTabs
        preserveState={false}
        label={STANDALONE_CHATS_COPY.heading}
        sections={[
          {
            id: "all",
            label: WORKSPACES_COPY.allAdventures,
            content: (
              <div className="flex flex-col gap-4">
                {filter}
                <ChatList
                  chats={visibleChats}
                  emptyMessage={STANDALONE_CHATS_COPY.noChats}
                  showProjectNames={true}
                />
              </div>
            ),
          },
          {
            id: "quests",
            label: WORKSPACES_COPY.questAdventures,
            content: (
              <div className="flex flex-col gap-4">
                {filter}
                <ChatList
                  chats={visibleChats.filter(
                    (chat) => chat.project !== undefined,
                  )}
                  emptyMessage={STANDALONE_CHATS_COPY.noChats}
                  showProjectNames={true}
                />
              </div>
            ),
          },
          {
            id: "standalone",
            label: WORKSPACES_COPY.standalone,
            content: (
              <ChatList
                chats={chats.filter((chat) => chat.project === undefined)}
                emptyMessage={STANDALONE_CHATS_COPY.noChats}
              />
            ),
          },
        ]}
      />
    );
  }
  return (
    <>
      {filter}
      <ChatList
        chats={visibleChats}
        emptyMessage={STANDALONE_CHATS_COPY.noChats}
        showProjectNames={true}
      />
    </>
  );
}

export { ChatProjectFilter };
