import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import type { listProjects } from "@/projects/store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { DONUT_PROJECT, FOX_PROJECT } from "../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  listProjects: vi.fn<typeof listProjects>(),
}));
vi.mock("@/projects/store.ts", () => store);

vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(),
}));

function pageFor(
  projectId: string | string[] | undefined,
): ReturnType<typeof NewChatPage> {
  return NewChatPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({ projectId }),
  });
}

describe("New chat page", () => {
  beforeEach(() => {
    signInAs(SIGNED_IN_USER);
    store.listProjects.mockResolvedValue([FOX_PROJECT, DONUT_PROJECT]);
  });

  test("preselects the project named in the search parameters", async () => {
    render(await pageFor(DONUT_PROJECT.id));

    expect(
      screen.getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel }),
    ).toHaveValue(DONUT_PROJECT.id);
    expect(store.listProjects).toHaveBeenCalledWith(SIGNED_IN_USER.id);
  });

  test("preselects the project named by its id in capitals", async () => {
    render(await pageFor(DONUT_PROJECT.id.toUpperCase()));

    expect(
      screen.getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel }),
    ).toHaveValue(DONUT_PROJECT.id);
  });

  test.each([
    ["a malformed project id", "donut"],
    ["an unknown project id", "00000000-0000-4000-8000-000000000000"],
  ])("preselects the first project for %s", async (_description, projectId) => {
    render(await pageFor(projectId));

    expect(
      screen.getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel }),
    ).toHaveValue(FOX_PROJECT.id);
  });

  test("ignores a repeated project parameter", async () => {
    render(await pageFor([DONUT_PROJECT.id, DONUT_PROJECT.id]));

    expect(
      screen.getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel }),
    ).toHaveValue(FOX_PROJECT.id);
  });
});
