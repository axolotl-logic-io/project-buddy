import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";

const EMAIL = "mabel@example.test";

const action =
  vi.fn<
    (state: LinkRequestState, formData: FormData) => Promise<LinkRequestState>
  >();

function sendForm(): void {
  render(<LinkRequestForm action={action} words={INVITATIONS_COPY} />);
  fireEvent.change(
    screen.getByRole("textbox", { name: INVITATIONS_COPY.emailLabel }),
    { target: { value: EMAIL } },
  );
  fireEvent.click(screen.getByRole("button", { name: INVITATIONS_COPY.send }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LinkRequestForm", () => {
  test("sends the address, then confirms the invitation was sent", async () => {
    action.mockResolvedValue({
      kind: "sent",
      message: INVITATIONS_COPY.sent,
      email: EMAIL,
    });

    sendForm();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        INVITATIONS_COPY.sent,
      );
    });
    const [, sent] = action.mock.lastCall ?? [];
    expect(Object.fromEntries(sent ?? new FormData())).toEqual({
      email: EMAIL,
    });
    expect(
      screen.getByRole("textbox", { name: INVITATIONS_COPY.emailLabel }),
    ).toHaveValue(EMAIL);
  });

  test("shows an invalid address on its field, keeping the address", async () => {
    action.mockResolvedValue({
      kind: "invalid",
      field: "email",
      message: INVITATIONS_COPY.needsEmail,
      email: EMAIL,
    });

    sendForm();

    expect(
      await screen.findByText(INVITATIONS_COPY.needsEmail),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(INVITATIONS_COPY.emailLabel)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("textbox", { name: INVITATIONS_COPY.emailLabel }),
    ).toHaveValue(EMAIL);
  });
});

describe("LinkRequestForm failing", () => {
  test("shows a failure in an alert", async () => {
    action.mockResolvedValue({
      kind: "error",
      message: INVITATIONS_COPY.failed,
      email: EMAIL,
    });

    sendForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      INVITATIONS_COPY.failed,
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
