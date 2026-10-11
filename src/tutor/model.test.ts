import { afterEach, describe, expect, test, vi } from "vitest";
import { classifyError } from "@/errors/classify-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { TUTOR_MODEL_ID, tutorModel } from "@/tutor/model.ts";

const CLAUDE_MODEL = /^claude-/u;
const ANTHROPIC_PROVIDER = /^anthropic/u;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// The API key header of the request Claude's model sends, answered with 401
// so nothing reaches Anthropic.
async function sentApiKey(): Promise<string | null> {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response("{}", { status: HTTP_STATUS.unauthorized })),
  );
  vi.stubGlobal("fetch", fetchMock);
  await tutorModel()
    .doStream({ prompt: [{ role: "user", content: [] }] })
    .then(
      () => undefined,
      () => undefined,
    );
  const [, init] = fetchMock.mock.calls[0] ?? [];
  return new Headers(init?.headers).get("x-api-key");
}

describe("tutorModel with Claude", () => {
  test("uses a Claude model through the Anthropic provider", () => {
    vi.stubEnv("TUTOR_MODEL", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");

    const model = tutorModel();

    expect(TUTOR_MODEL_ID).toMatch(CLAUDE_MODEL);
    expect(model.modelId).toBe(TUTOR_MODEL_ID);
    expect(model.provider).toMatch(ANTHROPIC_PROVIDER);
  });

  test("sends the API key that src/env.ts reads", async () => {
    vi.stubEnv("TUTOR_MODEL", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", "  sk-ant-test  ");

    expect(await sentApiKey()).toBe("sk-ant-test");
  });

  test("fails as an invalid API key when the key is missing", () => {
    vi.stubEnv("TUTOR_MODEL", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", " ");

    let failure: unknown;
    try {
      tutorModel();
    } catch (error) {
      failure = error;
    }

    expect(classifyError(failure)).toBe("invalid-api-key");
  });
});

describe("tutorModel with TUTOR_MODEL=mock", () => {
  test("uses the mock model, with no API key", () => {
    vi.stubEnv("TUTOR_MODEL", "mock");
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);

    expect(tutorModel().provider).toBe("mock");
  });
});
