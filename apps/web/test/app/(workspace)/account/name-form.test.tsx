// "use_case_set_name" in use-cases/accounts.md, its form: what she typed
// stays in the field whatever the action answers, with its message or
// "Saved". The mocked action answers as the server's does
// (set-name.server.test.ts).
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { setNameAction } from "@/app/(workspace)/account/actions.ts";
import { NameForm } from "@/app/(workspace)/account/name-form.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

const actions = vi.hoisted(() => ({
  setNameAction: vi.fn<typeof setNameAction>(),
}));
vi.mock("@/app/(workspace)/account/actions.ts", () => actions);

afterEach(() => {
  vi.clearAllMocks();
});

function nameField(): HTMLElement {
  return screen.getByRole("textbox", { name: ACCOUNT_COPY.nameLabel });
}

// Types name into the field and saves it.
function saveName(name: string): void {
  fireEvent.change(nameField(), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: ACCOUNT_COPY.saveName }));
}

describe("use_case_set_name", () => {
  test("a refused name stays in the field, with why", async () => {
    actions.setNameAction.mockResolvedValue({
      kind: "invalid",
      message: ACCOUNT_COPY.nameBraces,
    });
    render(<NameForm name="Mabel" />);

    saveName("{x}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      ACCOUNT_COPY.nameBraces,
    );
    expect(nameField()).toHaveValue("{x}");
    expect(nameField()).toBeInvalid();
  });

  test("a saved name stays in the field, and says it is saved", async () => {
    actions.setNameAction.mockResolvedValue({ kind: "saved" });
    render(<NameForm name={undefined} />);

    expect(nameField()).toHaveValue("");
    saveName("Mabel");

    expect(await screen.findByText(ACCOUNT_COPY.nameSaved)).toBeVisible();
    expect(nameField()).toHaveValue("Mabel");
  });
});
