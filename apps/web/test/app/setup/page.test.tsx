import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { readInvitation } from "@/accounts/invitations.ts";
import SetupLoading from "@/app/setup/loading.tsx";
import SetupPage from "@/app/setup/page.tsx";
import { SETUP_COPY } from "@/ui/copy/invitations.ts";

const TOKEN = "Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3";

const loginLinks = vi.hoisted(() => ({
  readInvitation: vi.fn<typeof readInvitation>(),
}));
vi.mock("@/accounts/invitations.ts", () => loginLinks);
vi.mock("next/server", () => ({
  connection: (): Promise<void> => Promise.resolve(),
}));
vi.mock("@/app/setup/actions.ts", () => ({
  confirmSetupAction: vi.fn(),
}));

async function renderPage(token: string | string[] | undefined): Promise<void> {
  render(
    await SetupPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ token }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  loginLinks.readInvitation.mockResolvedValue("learner@example.test");
});

describe("SetupPage", () => {
  test("asks the recipient to confirm setup, sending the link's token, for a link that works", async () => {
    await renderPage(TOKEN);

    expect(screen.getByText(SETUP_COPY.intro)).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: SETUP_COPY.confirm,
    });
    expect(button).toHaveAttribute("type", "submit");
    const form = button.closest("form");
    expect(form).toHaveFormValues({ token: TOKEN });
    expect(screen.getByText("learner@example.test")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(loginLinks.readInvitation).toHaveBeenCalledWith(
      TOKEN,
      expect.any(Date),
    );
  });

  test("says the link has expired, with a link to ask for a new one", async () => {
    loginLinks.readInvitation.mockResolvedValue(undefined);

    await renderPage(TOKEN);

    expect(screen.getByText(SETUP_COPY.unusable)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: SETUP_COPY.signIn }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test.each([
    ["missing", undefined],
    ["repeated", [TOKEN, TOKEN]],
  ])("reads a %s token as an empty one", async (_name, token) => {
    loginLinks.readInvitation.mockResolvedValue(undefined);

    await renderPage(token);

    expect(loginLinks.readInvitation).toHaveBeenCalledWith(
      "",
      expect.any(Date),
    );
    expect(screen.getByText(SETUP_COPY.unusable)).toBeInTheDocument();
  });
});

describe("SetupLoading", () => {
  test("says the link is being checked", () => {
    render(<SetupLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(SETUP_COPY.loading);
  });
});
