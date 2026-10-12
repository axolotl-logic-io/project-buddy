import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

const EMAIL = "mabel@example.test";

const action =
  vi.fn<
    (state: LinkRequestState, formData: FormData) => Promise<LinkRequestState>
  >();

function sendForm(): void {
  render(<LinkRequestForm action={action} words={SIGNUP_COPY} />);
  fireEvent.change(screen.getByLabelText(SIGNUP_COPY.passphraseLabel), {
    target: { value: "guess" },
  });
  fireEvent.change(
    screen.getByRole("textbox", { name: SIGNUP_COPY.emailLabel }),
    { target: { value: EMAIL } },
  );
  fireEvent.click(screen.getByRole("button", { name: SIGNUP_COPY.send }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LinkRequestForm", () => {
  test("sends the passphrase and the address, then says to check her email", async () => {
    action.mockResolvedValue({
      kind: "sent",
      message: SIGNUP_COPY.checkEmail,
      email: EMAIL,
    });

    sendForm();

    expect(await screen.findByRole("status")).toHaveTextContent(
      SIGNUP_COPY.checkEmail,
    );
    const [, sent] = action.mock.lastCall ?? [];
    expect(Object.fromEntries(sent ?? new FormData())).toEqual({
      passphrase: "guess",
      email: EMAIL,
    });
    expect(
      screen.getByRole("textbox", { name: SIGNUP_COPY.emailLabel }),
    ).toHaveValue(EMAIL);
  });

  test("shows a wrong passphrase on its field, keeping the address", async () => {
    action.mockResolvedValue({
      kind: "invalid",
      field: "passphrase",
      message: SIGNUP_COPY.wrongPassphrase,
      email: EMAIL,
    });

    sendForm();

    expect(
      await screen.findByText(SIGNUP_COPY.wrongPassphrase),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(SIGNUP_COPY.passphraseLabel)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("textbox", { name: SIGNUP_COPY.emailLabel }),
    ).toHaveValue(EMAIL);
  });
});

describe("LinkRequestForm failing", () => {
  test("shows a failure in an alert", async () => {
    action.mockResolvedValue({
      kind: "error",
      message: SIGNUP_COPY.lockedOut,
      email: EMAIL,
    });

    sendForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      SIGNUP_COPY.lockedOut,
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
