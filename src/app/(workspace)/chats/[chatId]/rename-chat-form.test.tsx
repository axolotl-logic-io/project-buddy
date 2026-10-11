import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MR_T_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
import { COPY } from "@/ui/copy.ts";
import type { RenameChatState } from "./actions.ts";
import { RenameChatForm } from "./rename-chat-form.tsx";

vi.mock("./actions.ts", () => ({
  renameChatAction: vi.fn(
    async () =>
      ({
        kind: "invalid",
        message: COPY.chatName.needsName,
      }) satisfies RenameChatState,
  ),
}));

function nameField(): HTMLElement {
  return screen.getByRole("textbox", { name: COPY.chatName.label });
}

describe("RenameChatForm", () => {
  test("offers the chat's name to change, one line of the longest length", () => {
    render(<RenameChatForm chatId={MR_T_CHAT.id} name="Beveling the donut" />);

    expect(nameField()).toHaveValue("Beveling the donut");
    expect(nameField()).toBeRequired();
    expect(nameField()).toHaveAttribute(
      "maxLength",
      String(CHAT_NAME_MAX_LENGTH),
    );
  });

  test("starts empty for a chat with no name yet", () => {
    render(<RenameChatForm chatId={MR_T_CHAT.id} name={undefined} />);

    expect(nameField()).toHaveValue("");
  });

  test("shows the message the action returns, keeping her text", async () => {
    render(<RenameChatForm chatId={MR_T_CHAT.id} name={undefined} />);

    fireEvent.change(nameField(), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: COPY.chatName.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      COPY.chatName.needsName,
    );
    expect(nameField()).toHaveValue("   ");
  });

  test("shows a new name from the page in a field she hasn't changed", () => {
    const { rerender } = render(
      <RenameChatForm chatId={MR_T_CHAT.id} name={undefined} />,
    );

    rerender(
      <RenameChatForm chatId={MR_T_CHAT.id} name="Beveling the donut" />,
    );

    expect(nameField()).toHaveValue("Beveling the donut");
  });
});
