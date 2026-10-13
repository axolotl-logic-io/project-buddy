// ChatView on a build older than the server's, mid-deploy: a failure that
// names a case this build doesn't know reloads the page to pick up the new
// build. The reload itself is mocked; newer-build-reload.test.ts tests it.
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ChatView } from "@/components/chat-view.tsx";
import { refresh } from "@/components/router-test-kit.ts";
import { userMessage } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { chatIdFixture } from "@/id-fixtures.ts";

vi.mock("next/navigation", () => import("@/components/router-test-kit.ts"));

const { reloadForNewerBuild } = vi.hoisted(() => ({
  reloadForNewerBuild: vi.fn<() => boolean>(() => true),
}));
vi.mock("@/errors/newer-build-reload.ts", () => ({ reloadForNewerBuild }));

function sendMessage(response: () => Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() => Promise.resolve(response())),
  );
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={[]}
      personaName="Tutor"
    />,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
    target: { value: "How do I bevel?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
  reloadForNewerBuild.mockClear();
});

describe("ChatView on a build older than the server's", () => {
  test("reloads the page once for a case this build doesn't know", async () => {
    sendMessage(
      () =>
        new Response("future-case", { status: HTTP_STATUS.tooManyRequests }),
    );

    await vi.waitFor(() => {
      expect(reloadForNewerBuild).toHaveBeenCalledOnce();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessage("unknown"),
    );
  });

  test("doesn't reload for the unknown case", async () => {
    sendMessage(
      () =>
        new Response("unknown", { status: HTTP_STATUS.internalServerError }),
    );

    await screen.findByRole("alert");
    expect(reloadForNewerBuild).not.toHaveBeenCalled();
  });
});
