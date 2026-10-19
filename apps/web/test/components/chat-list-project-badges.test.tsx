import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ChatList } from "@/components/chat-list.tsx";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture } from "../id-fixtures.ts";
import { PROJECT_CHAT } from "./chat-list-fixtures.ts";

describe("ChatList shared projects", () => {
  test("shows a badge on every card even when chats share a project", () => {
    const chats = [PROJECT_CHAT, { ...PROJECT_CHAT, id: chatIdFixture() }];
    render(<ChatList chats={chats} showProjectNames={true} />);

    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(chats.length);
    for (const card of cards) {
      const badge = within(card).getByText(PROJECT_CHAT.projectName);
      expect(badge).toBeVisible();
      expect(within(card).getByRole("link")).not.toContainElement(badge);
    }
    expect(
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual(chats.map((chat) => `/chats/${chat.id}`));
  });
});

describe("ChatList badge presentation updates", () => {
  test("uses the semantic colour pair covered by the theme contrast checks", () => {
    render(<ChatList chats={[PROJECT_CHAT]} showProjectNames={true} />);

    expect(screen.getByText(PROJECT_CHAT.projectName)).toHaveClass(
      "text-muted",
      "bg-field",
    );
  });

  test("reflects supplied name changes and removes badges when disabled", () => {
    const { rerender } = render(
      <ChatList chats={[PROJECT_CHAT]} showProjectNames={true} />,
    );
    expect(screen.getByText(PROJECT_CHAT.projectName)).toBeVisible();

    rerender(
      <ChatList
        chats={[{ ...PROJECT_CHAT, projectName: "Spaceship" }]}
        showProjectNames={true}
      />,
    );
    expect(
      screen.queryByText(PROJECT_CHAT.projectName),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Spaceship")).toBeVisible();

    rerender(
      <ChatList
        chats={[{ ...PROJECT_CHAT, projectName: "Spaceship" }]}
        showProjectNames={false}
      />,
    );
    expect(screen.queryByText("Spaceship")).not.toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAccessibleName(
      CHAT_NAME_COPY.listTitle(PROJECT_CHAT.name, PROJECT_CHAT.buddy.name),
    );
    expect(link).toHaveAttribute("href", `/chats/${PROJECT_CHAT.id}`);
  });
});
