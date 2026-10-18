import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import StandaloneChatsLayout from "@/app/(workspace)/chat/layout.tsx";
import StandaloneChatsLoading from "@/app/(workspace)/chat/loading.tsx";
import StandaloneChatsPage from "@/app/(workspace)/chat/page.tsx";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import type { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import type { listCentralChats } from "@/chats/central-chat.ts";
import { NEW_CHAT_COPY, STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { userBuddyIdFixture } from "../../../id-fixtures.ts";
import { CENTRAL_CHAT } from "../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
const stores = vi.hoisted(() => ({
  listCentralChats: vi.fn<typeof listCentralChats>(),
  ownBuddyChoices: vi.fn<typeof ownBuddyChoices>(),
}));
vi.mock("@/chats/central-chat.ts", () => ({
  listCentralChats: stores.listCentralChats,
}));
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: stores.ownBuddyChoices,
}));
vi.mock("@/app/(workspace)/chat/actions.ts", () => ({
  startStandaloneChatAction: vi.fn(),
}));

const OWN_BUDDY: OwnBuddyChoice = {
  id: userBuddyIdFixture(),
  name: "My buddy",
};

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  stores.listCentralChats.mockResolvedValue([CENTRAL_CHAT]);
  stores.ownBuddyChoices.mockResolvedValue([OWN_BUDDY]);
});

describe("standalone chat hub", () => {
  test("offers a buddy picker and previous chats in a projects-style page", async () => {
    render(
      <StandaloneChatsLayout params={Promise.resolve({})}>
        {await StandaloneChatsPage()}
      </StandaloneChatsLayout>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: STANDALONE_CHATS_COPY.heading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: STANDALONE_CHATS_COPY.listHeading,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: CENTRAL_CHAT.buddy.name }),
    ).toHaveAttribute("href", `/chats/${CENTRAL_CHAT.id}`);
    expect(
      screen.getByRole("radio", { name: OWN_BUDDY.name }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: NEW_CHAT_COPY.start }),
    ).toBeInTheDocument();
    expect(stores.listCentralChats).toHaveBeenCalledWith(SIGNED_IN_USER.id);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("offers a new chat without requiring a project", async () => {
    stores.listCentralChats.mockResolvedValue([]);
    render(await StandaloneChatsPage());
    expect(screen.getByText(STANDALONE_CHATS_COPY.noChats)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: NEW_CHAT_COPY.start }),
    ).toBeEnabled();
  });

  test("shows a loading skeleton while chat data loads", () => {
    render(<StandaloneChatsLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      STANDALONE_CHATS_COPY.loading,
    );
  });
});

// Issue #471: the site calls its chats list "Chats".
describe("the chats list's heading", () => {
  test("heads the list of previous chats Chats", async () => {
    render(await StandaloneChatsPage());

    expect(
      screen.getByRole("heading", { level: 2, name: "Chats" }),
    ).toBeInTheDocument();
  });
});
