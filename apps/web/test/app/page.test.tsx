import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "@/app/page.tsx";
import { SITE_COPY } from "@/ui/copy/site.ts";

describe("Home page", () => {
  test("shows the site heading and tagline", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: SITE_COPY.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(SITE_COPY.tagline)).toBeInTheDocument();
  });

  // Issue #471: the site calls its two lists "Projects" and "Chats".
  test("names the two lists' links Projects and Chats", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: "Chats" })).toHaveAttribute(
      "href",
      "/chat",
    );
  });

  test("leaves the main landmark to the root layout", () => {
    render(<Home />);

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});
