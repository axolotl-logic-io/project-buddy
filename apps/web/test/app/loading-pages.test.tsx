import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import AccountLoading from "@/app/(workspace)/account/loading.tsx";
import BuddyListLoading from "@/app/(workspace)/buddies/(list)/loading.tsx";
import BuddyLoading from "@/app/(workspace)/buddies/[buddyId]/loading.tsx";
import ChatHubLoading from "@/app/(workspace)/chat/loading.tsx";
import ChatLoading from "@/app/(workspace)/chats/[chatId]/loading.tsx";
import NewChatLoading from "@/app/(workspace)/chats/new/loading.tsx";
import ProjectListLoading from "@/app/(workspace)/projects/(list)/loading.tsx";
import ProjectLoading from "@/app/(workspace)/projects/[projectId]/(overview)/loading.tsx";
import MemoryLoading from "@/app/(workspace)/projects/[projectId]/memory/loading.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { BUDDIES_COPY, BUDDY_COPY } from "@/ui/copy/buddies.ts";
import {
  CHAT_COPY,
  NEW_CHAT_COPY,
  STANDALONE_CHATS_COPY,
} from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";

test.each([
  {
    path: "@/app/(workspace)/account/loading.tsx",
    loading: AccountLoading,
    label: ACCOUNT_COPY.loading,
  },
  {
    path: "@/app/(workspace)/buddies/(list)/loading.tsx",
    loading: BuddyListLoading,
    label: BUDDIES_COPY.loading,
  },
  {
    path: "@/app/(workspace)/buddies/[buddyId]/loading.tsx",
    loading: BuddyLoading,
    label: BUDDY_COPY.loading,
  },
  {
    path: "@/app/(workspace)/chats/[chatId]/loading.tsx",
    loading: ChatLoading,
    label: CHAT_COPY.loading,
  },
  {
    path: "@/app/(workspace)/chats/new/loading.tsx",
    loading: NewChatLoading,
    label: NEW_CHAT_COPY.loading,
  },
  {
    path: "@/app/(workspace)/projects/(list)/loading.tsx",
    loading: ProjectListLoading,
    label: PROJECTS_COPY.loading,
  },
  {
    path: "@/app/(workspace)/projects/[projectId]/(overview)/loading.tsx",
    loading: ProjectLoading,
    label: PROJECT_COPY.loading,
  },
  {
    path: "@/app/(workspace)/projects/[projectId]/memory/loading.tsx",
    loading: MemoryLoading,
    label: MEMORY_COPY.loading,
  },
  {
    path: "@/app/(workspace)/chat/loading.tsx",
    loading: ChatHubLoading,
    label: STANDALONE_CHATS_COPY.loading,
  },
])("$path shows a labelled busy status", ({ loading: Loading, label }) => {
  render(<Loading />);
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("status")).toHaveTextContent(label);
});
