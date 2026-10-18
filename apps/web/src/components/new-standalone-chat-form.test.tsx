import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import type {
  StartStandaloneChatState,
  startStandaloneChatAction,
} from "@/app/(workspace)/chat/actions.ts";
import { NewStandaloneChatForm } from "@/components/new-standalone-chat-form.tsx";
import { userBuddyIdFixture } from "@/id-fixtures.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

const actions = vi.hoisted(() => ({
  startStandaloneChatAction: vi.fn<typeof startStandaloneChatAction>(),
}));
vi.mock("@/app/(workspace)/chat/actions.ts", () => actions);
const OWN_BUDDY = { id: userBuddyIdFixture(), name: "My buddy" };
const INVALID: StartStandaloneChatState = {
  kind: "invalid",
  message: NEW_CHAT_COPY.chooseBuddy,
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.startStandaloneChatAction.mockResolvedValue(INVALID);
});

test("submits the chosen built-in or owned buddy without a project", async () => {
  render(<NewStandaloneChatForm userBuddies={[OWN_BUDDY]} />);
  fireEvent.click(screen.getByRole("radio", { name: OWN_BUDDY.name }));
  fireEvent.click(screen.getByRole("button", { name: NEW_CHAT_COPY.start }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    NEW_CHAT_COPY.chooseBuddy,
  );
  const [call] = actions.startStandaloneChatAction.mock.calls;
  expect(call?.[1].get("buddyId")).toBe(OWN_BUDDY.id);
  expect(call?.[1].has("projectId")).toBe(false);
});

test("shows pending feedback and disables starting twice", async () => {
  const { promise, resolve } =
    Promise.withResolvers<
      Awaited<ReturnType<typeof startStandaloneChatAction>>
    >();
  actions.startStandaloneChatAction.mockReturnValue(promise);
  render(<NewStandaloneChatForm userBuddies={[]} />);
  const button = screen.getByRole("button", { name: NEW_CHAT_COPY.start });
  fireEvent.click(button);
  await waitFor(() => expect(button).toBeDisabled());
  expect(screen.getByRole("status")).toHaveTextContent(NEW_CHAT_COPY.starting);
  resolve(INVALID);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(button).toBeEnabled();
});

test("keeps the chosen buddy when the quota refuses a new chat", async () => {
  const message = "Monthly quota used up.";
  actions.startStandaloneChatAction.mockResolvedValue({
    kind: "quotaUsedUp",
    message,
    buddyId: OWN_BUDDY.id,
  });
  render(<NewStandaloneChatForm userBuddies={[OWN_BUDDY]} />);
  fireEvent.click(screen.getByRole("radio", { name: OWN_BUDDY.name }));
  fireEvent.click(screen.getByRole("button", { name: NEW_CHAT_COPY.start }));
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.getByRole("radio", { name: OWN_BUDDY.name })).toBeChecked();
});
