import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ManualCitationsPart } from "@/components/chat/manual-citations-part.tsx";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";

const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const EXTRUDE_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/face/extrude_faces.html#extrude-faces";

const TWO_CITATIONS: Parameters<typeof ManualCitationsPart>[0]["part"] = {
  result: {
    citations: [
      { label: "Bevel › Usage", url: BEVEL_URL },
      { label: "Extrude Faces", url: EXTRUDE_URL },
    ],
  },
};

describe("ManualCitationsPart", () => {
  test("links each cited section, by label, to open in a new tab, as each link's description says", () => {
    render(<ManualCitationsPart part={TWO_CITATIONS} />);

    const citations = screen.getByRole("region", {
      name: CITATIONS_COPY.heading,
    });
    const links = screen.getAllByRole("link");
    expect(citations).toContainElement(links[0] ?? null);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      BEVEL_URL,
      EXTRUDE_URL,
    ]);
    expect(screen.getByRole("link", { name: "Bevel › Usage" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("link", { name: "Bevel › Usage" })).toHaveAttribute(
      "rel",
      "noreferrer",
    );
    for (const link of links) {
      expect(link).toHaveAccessibleDescription(CITATIONS_COPY.opensInNewTab);
      // A secondary button's look, while it stays a link.
      expect(link).toHaveClass("button-secondary");
    }
    expect(links[0]?.textContent).toBe("Bevel › Usage");
  });

  test("shows nothing without citations, before they arrive or when malformed", () => {
    const { container, rerender } = render(
      <ManualCitationsPart part={{ result: { citations: [] } }} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<ManualCitationsPart part={{ result: undefined }} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<ManualCitationsPart part={{ result: { error: "boom" } }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("links nothing that isn't a manual URL", () => {
    const { container } = render(
      <ManualCitationsPart
        part={{
          result: {
            citations: [
              { label: "Bevel › Usage", url: BEVEL_URL },
              { label: "Trap", url: "javascript:alert(1)" },
            ],
          },
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
