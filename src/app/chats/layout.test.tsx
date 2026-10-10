import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ChatsLayout from "./layout.tsx";

describe("Chats layout", () => {
  test("puts the page inside the main landmark", () => {
    render(
      <ChatsLayout params={Promise.resolve({})}>
        <section aria-label="Page" />
      </ChatsLayout>,
    );

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("region", { name: "Page" }),
    );
  });
});
