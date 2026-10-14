import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Icon } from "@/components/ui/icon.tsx";

const SEND = "Send";

describe("Icon", () => {
  test("is decoration, so the words beside it alone name a control", () => {
    render(
      <button type="button">
        <Icon name="send" />
        {SEND}
      </button>,
    );

    expect(screen.getByRole("button")).toHaveAccessibleName(SEND);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("fills only the shapes an icon fills, in the text colour", () => {
    const { container } = render(
      <>
        <Icon name="appearance" />
        <Icon name="send" />
      </>,
    );

    const fills = [...container.querySelectorAll("svg")].map((svg) =>
      [...svg.querySelectorAll("path")].map((path) =>
        path.getAttribute("fill"),
      ),
    );
    expect(fills).toEqual([[null, "currentColor"], [null]]);
  });

  test("takes the caller's layout utilities", () => {
    const { container } = render(
      <Icon className="-rotate-90" name="chevron-down" />,
    );

    expect(container.firstElementChild).toHaveClass("-rotate-90");
  });
});
