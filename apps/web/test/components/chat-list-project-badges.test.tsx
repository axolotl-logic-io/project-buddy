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

describe("ChatList late opt-in", () => {
  test("can opt in after rendering without changing the conversation or started time", () => {
    const { rerender } = render(<ChatList chats={[PROJECT_CHAT]} />);
    const originalText = screen.getByRole("listitem").textContent ?? "";
    expect(
      screen.queryByText(PROJECT_CHAT.projectName),
    ).not.toBeInTheDocument();

    rerender(<ChatList chats={[PROJECT_CHAT]} showProjectNames={true} />);

    const card = screen.getByRole("listitem");
    const badge = within(card).getByText(PROJECT_CHAT.projectName);
    const link = within(card).getByRole("link");
    expect(badge).toBeVisible();
    expect(link).not.toContainElement(badge);
    expect(link).toHaveAccessibleName(
      CHAT_NAME_COPY.listTitle(PROJECT_CHAT.name, PROJECT_CHAT.buddy.name),
    );
    expect(link).toHaveAttribute("href", `/chats/${PROJECT_CHAT.id}`);
    expect(card.textContent?.replace(PROJECT_CHAT.projectName, "")).toBe(
      originalText,
    );
  });
});

describe("ChatList badge presentation updates", () => {
  test("shows markup-like project names as literal text outside the link", () => {
    const projectName = "<b>Donut & Spaceship</b>";
    render(
      <ChatList
        chats={[{ ...PROJECT_CHAT, projectName }]}
        showProjectNames={true}
      />,
    );

    const badge = screen.getByText(projectName, { exact: true });
    expect(badge).toBeVisible();
    expect(screen.getByRole("listitem")).toContainElement(badge);
    const link = screen.getByRole("link");
    expect(link).not.toContainElement(badge);
    expect(link).toHaveAccessibleName(
      CHAT_NAME_COPY.listTitle(PROJECT_CHAT.name, PROJECT_CHAT.buddy.name),
    );
    expect(link).toHaveAttribute("href", `/chats/${PROJECT_CHAT.id}`);
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
