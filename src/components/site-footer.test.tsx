import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SiteFooter } from "@/components/site-footer.tsx";

describe("SiteFooter", () => {
  test("credits the manual and its license in one sentence", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Includes content adapted from the Blender Reference Manual, licensed under CC BY-SA 4.0.",
    );
  });

  test("credits the Blender Reference Manual", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "Blender Reference Manual" }),
    ).toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
  });

  test("links to the CC BY-SA 4.0 license", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "CC BY-SA 4.0" }),
    ).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
  });
});
