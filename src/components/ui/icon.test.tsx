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

  test("takes the caller's layout utilities", () => {
    const { container } = render(
      <Icon className="-rotate-90" name="chevron-down" />,
    );

    expect(container.firstElementChild).toHaveClass("-rotate-90");
  });
});
