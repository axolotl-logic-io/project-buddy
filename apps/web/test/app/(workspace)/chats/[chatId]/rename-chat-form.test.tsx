import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { RenameChatState } from "@/app/(workspace)/chats/[chatId]/actions.ts";
import { RenameChatForm } from "@/app/(workspace)/chats/[chatId]/rename-chat-form.tsx";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { FOX_CHAT } from "../../page-fixtures.ts";

vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => ({
  renameChatAction: vi.fn(
    async () =>
      ({
        kind: "invalid",
        message: CHAT_NAME_COPY.needsName,
      }) satisfies RenameChatState,
  ),
}));

function nameField(): HTMLElement {
  return screen.getByRole("textbox", { name: CHAT_NAME_COPY.label });
}

// Unfolds the form, as she does before renaming.
function openForm(): void {
  fireEvent.click(screen.getByRole("button", { name: CHAT_NAME_COPY.rename }));
}

describe("RenameChatForm", () => {
  test("is folded away until she opens it", () => {
    render(<RenameChatForm chatId={FOX_CHAT.id} name={undefined} />);
    const rename = screen.getByRole("button", { name: CHAT_NAME_COPY.rename });

    expect(rename).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("textbox", { name: CHAT_NAME_COPY.label }),
    ).not.toBeInTheDocument();
    fireEvent.click(rename);
    expect(rename).toHaveAttribute("aria-expanded", "true");
    expect(nameField()).toBeVisible();
  });

  test("offers the chat's name to change, one line of the longest length", () => {
    render(<RenameChatForm chatId={FOX_CHAT.id} name="Beveling the donut" />);
    openForm();

    expect(nameField()).toHaveValue("Beveling the donut");
    expect(nameField()).toBeRequired();
    expect(nameField()).toHaveAttribute(
      "maxLength",
      String(CHAT_NAME_MAX_LENGTH),
    );
  });

  test("starts empty for a chat with no name yet", () => {
    render(<RenameChatForm chatId={FOX_CHAT.id} name={undefined} />);
    openForm();

    expect(nameField()).toHaveValue("");
  });
});

// "use_case_rename_chat" in use-cases/chats.md, its name of spaces: the
// mocked action refuses it as the server's does (actions.test.ts).
describe("use_case_rename_chat", () => {
  test("a name of spaces shows the action's message and keeps her text", async () => {
    render(<RenameChatForm chatId={FOX_CHAT.id} name={undefined} />);
    openForm();

    fireEvent.change(nameField(), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: CHAT_NAME_COPY.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      CHAT_NAME_COPY.needsName,
    );
    expect(nameField()).toHaveValue("   ");
    expect(nameField()).toHaveAccessibleDescription(CHAT_NAME_COPY.needsName);
    expect(nameField()).toBeInvalid();
  });
});

describe("RenameChatForm answers", () => {
  test("shows a new name from the page in a field she hasn't changed", () => {
    const { rerender } = render(
      <RenameChatForm chatId={FOX_CHAT.id} name={undefined} />,
    );
    openForm();

    rerender(<RenameChatForm chatId={FOX_CHAT.id} name="Beveling the donut" />);

    expect(nameField()).toHaveValue("Beveling the donut");
  });
});
