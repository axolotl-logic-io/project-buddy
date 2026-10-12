import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { readLoginLinkUser } from "@/accounts/login-links.ts";
import { userIdFixture } from "@/id-fixtures.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";
import LoginLinkLoading from "./loading.tsx";
import LoginLinkPage from "./page.tsx";

const TOKEN = "Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3";

const loginLinks = vi.hoisted(() => ({
  readLoginLinkUser: vi.fn<typeof readLoginLinkUser>(),
}));
vi.mock("@/accounts/login-links.ts", () => loginLinks);
vi.mock("@/app/login/link/actions.ts", () => ({
  continueSignInAction: vi.fn(),
}));

async function renderPage(token: string | string[] | undefined): Promise<void> {
  render(
    await LoginLinkPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ token }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  loginLinks.readLoginLinkUser.mockResolvedValue({
    id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
    sessionEpoch: 0,
  });
});

describe("LoginLinkPage", () => {
  test("asks her to continue, sending the link's token, for a link that works", async () => {
    await renderPage(TOKEN);

    expect(screen.getByText(LINK_PAGE_COPY.intro)).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: LINK_PAGE_COPY.continue,
    });
    expect(button).toHaveAttribute("type", "submit");
    const form = button.closest("form");
    expect(form).toHaveFormValues({ token: TOKEN });
    expect(loginLinks.readLoginLinkUser).toHaveBeenCalledWith(
      TOKEN,
      expect.any(Date),
    );
  });

  test("says the link has expired, with a link to ask for a new one", async () => {
    loginLinks.readLoginLinkUser.mockResolvedValue(undefined);

    await renderPage(TOKEN);

    expect(screen.getByText(LINK_PAGE_COPY.expired)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: LINK_PAGE_COPY.newLink }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test.each([
    ["missing", undefined],
    ["repeated", [TOKEN, TOKEN]],
  ])("reads a %s token as an empty one", async (_name, token) => {
    loginLinks.readLoginLinkUser.mockResolvedValue(undefined);

    await renderPage(token);

    expect(loginLinks.readLoginLinkUser).toHaveBeenCalledWith(
      "",
      expect.any(Date),
    );
    expect(screen.getByText(LINK_PAGE_COPY.expired)).toBeInTheDocument();
  });
});

describe("LoginLinkLoading", () => {
  test("says the link is being checked", () => {
    render(<LoginLinkLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      LINK_PAGE_COPY.loading,
    );
  });
});
