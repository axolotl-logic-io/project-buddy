// ChatView on a build older than the server's, mid-deploy: a failure that
// names a case this build doesn't know reloads the page to pick up the new
// build. The reload itself is mocked; newer-build-reload.test.ts tests it.
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userMessage } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { answerChat, renderChat, sendMessage } from "./chat-view-test-kit.tsx";
import { refresh } from "./router-test-kit.ts";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

const { reloadForNewerBuild } = vi.hoisted(() => ({
  reloadForNewerBuild: vi.fn<() => boolean>(() => true),
}));
vi.mock("@/errors/newer-build-reload.ts", () => ({ reloadForNewerBuild }));
function sendAnswered(response: () => Response): void {
  answerChat(response());
  renderChat();
  sendMessage();
}

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
  reloadForNewerBuild.mockClear();
});

describe("ChatView on a build older than the server's", () => {
  test("reloads the page once for a case this build doesn't know", async () => {
    sendAnswered(
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
    sendAnswered(
      () =>
        new Response("unknown", { status: HTTP_STATUS.internalServerError }),
    );

    await screen.findByRole("alert");
    expect(reloadForNewerBuild).not.toHaveBeenCalled();
  });
});
