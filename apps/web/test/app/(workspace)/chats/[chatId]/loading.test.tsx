import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ChatLoading from "@/app/(workspace)/chats/[chatId]/loading.tsx";

describe("Chat loading", () => {
  test("says loading chat… while the page streams in", () => {
    render(<ChatLoading />);

    expect(screen.getByText("Loading chat…")).toBeInTheDocument();
  });
});
