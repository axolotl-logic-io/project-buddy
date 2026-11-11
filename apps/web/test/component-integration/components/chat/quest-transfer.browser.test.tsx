import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  confirmQuestTransferAction,
  readQuestTransferAction,
} from "@/chats/quest-transfer-action.ts";
import { QuestTransferForm } from "@/components/chat/quest-transfer-form.tsx";
import { CHAT_ID, PROJECT_ID } from "@/ids.ts";
import { CREATE_PROJECT_COPY } from "@/ui/copy/chat.ts";

const PROPOSAL = {
  status: "proposed",
  proposalId: "c9bcecc5-46da-40f3-876d-af5c26d6ad90",
  name: "Fox",
  summary: "Next step: shape the fox.",
  motivation: "A gift.",
} as const;
const EDITED = "Next step: sketch first. Still planned, not completed.";
const CREATED = {
  status: "created",
  name: PROPOSAL.name,
  projectId: PROJECT_ID.parse("dab599e8-0128-4d2e-a2b4-0fa3d1394ac9"),
  interviewChatId: CHAT_ID.parse("b9d17657-d9d3-4de7-8845-136b52d0e831"),
} as const;

test("only confirmation creates a quest; a failure keeps the edited summary for retry", async () => {
  vi.mocked(confirmQuestTransferAction).mockClear();
  vi.mocked(readQuestTransferAction).mockResolvedValue(undefined);
  vi.mocked(confirmQuestTransferAction).mockRejectedValueOnce(
    new Error("Local failure"),
  );
  await render(<QuestTransferForm proposal={PROPOSAL} />);
  expect(confirmQuestTransferAction).not.toHaveBeenCalled();
  await page
    .getByRole("textbox", { name: CREATE_PROJECT_COPY.summary, exact: true })
    .fill(EDITED);
  await page.getByRole("button", { name: CREATE_PROJECT_COPY.confirm }).click();
  await expect.element(page.getByRole("alert")).toBeVisible();
  await expect
    .element(
      page.getByRole("textbox", {
        name: CREATE_PROJECT_COPY.summary,
        exact: true,
      }),
    )
    .toHaveValue(EDITED);
  vi.mocked(confirmQuestTransferAction).mockResolvedValueOnce(CREATED);
  await page.getByRole("button", { name: CREATE_PROJECT_COPY.confirm }).click();
  await expect
    .element(
      page.getByRole("link", { name: CREATE_PROJECT_COPY.openQuest }),
    )
    .toHaveAttribute("href", `/projects/${CREATED.projectId}`);
  const [form] = vi.mocked(confirmQuestTransferAction).mock.lastCall ?? [];
  expect(form?.get("summary")).toBe(EDITED);
  expect(form?.get("motivation")).toBe(PROPOSAL.motivation);
});

test("reopening a confirmed proposal shows the saved quest without another creation", async () => {
  vi.mocked(confirmQuestTransferAction).mockClear();
  vi.mocked(readQuestTransferAction).mockResolvedValueOnce(CREATED);
  await render(<QuestTransferForm proposal={PROPOSAL} />);
  await expect
    .element(
      page.getByRole("link", { name: CREATE_PROJECT_COPY.openQuest }),
    )
    .toBeVisible();
  expect(confirmQuestTransferAction).not.toHaveBeenCalled();
});
