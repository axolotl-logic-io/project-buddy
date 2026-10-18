import type { Metadata } from "next";
import type { JSX } from "react";
import { singleValue } from "@/app/search-param.ts";
import { requireUser } from "@/auth/current-user.ts";
import { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { NewStandaloneChatForm } from "@/components/new-standalone-chat-form.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import { parseProjectId } from "@/ids.ts";
import { listProjects, type Project } from "@/projects/store.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

// The project the URL names, if it is one of hers. Any other id, another
// user's, unknown or malformed, names none, so the page shows every chat.
function chosenProject(
  projects: readonly Project[],
  parameter: string | string[] | undefined,
): Project | undefined {
  const id = parseProjectId(singleValue(parameter) ?? "");
  if (id === undefined) {
    return undefined;
  }
  return projects.find((project) => project.id === id);
}

// The selector of the project whose chats the list shows, or All. It gets
// /chat?project=<id>, so the choice is in the page's URL.
function ProjectFilter({
  projects,
  chosen,
}: {
  readonly projects: readonly Project[];
  readonly chosen: Project | undefined;
}): JSX.Element {
  return (
    <form
      action="/chat"
      className="flex flex-wrap items-end gap-3"
      method="get"
    >
      <div className="min-w-0 flex-1">
        <SelectField
          className="min-h-(--target-size) truncate"
          defaultValue={chosen?.id ?? ""}
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

export const metadata: Metadata = { title: STANDALONE_CHATS_COPY.title };

export default async function StandaloneChatsPage({
  searchParams,
}: PageProps<"/chat">): Promise<JSX.Element> {
  const { project } = await searchParams;
  const user = await requireUser();
  const [projects, userBuddies] = await Promise.all([
    listProjects(user.id),
    ownBuddyChoices(),
  ]);
  const chosen = chosenProject(projects, project);
  const chats = await listAllChats(user.id, chosen?.id);
  return (
    <>
      <section className="panel flex flex-col gap-5">
        <h2 className="section-heading">{STANDALONE_CHATS_COPY.newHeading}</h2>
        <NewStandaloneChatForm userBuddies={userBuddies} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{STANDALONE_CHATS_COPY.listHeading}</h2>
        <ProjectFilter chosen={chosen} projects={projects} />
        <ChatList
          chats={chats}
          emptyMessage={STANDALONE_CHATS_COPY.noChats}
          showProjectNames={true}
        />
      </section>
    </>
  );
}
