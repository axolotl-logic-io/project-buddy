import { generateText, streamText } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  CHAT_NAME_MODEL_ID,
  chatNameModel,
  TUTOR_MODEL_ID,
  tutorModel,
} from "@/tutor/model.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { userIdFixture } from "../id-fixtures.ts";
import { quotaGrantFixture } from "../quota/quota-test-kit.ts";

const CLAUDE_MODEL = /^claude-/u;
const HAIKU_MODEL = /^claude-haiku-/u;
const ANTHROPIC_PROVIDER = /^anthropic/u;
const OWNER = userIdFixture();
const GRANT = quotaGrantFixture(OWNER);
const FIRST_OF_A_MONTH = /^\d{4}-\d{2}-01$/u;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// The mock model, with the database the spend meter adds each call's cost
// to, and the meter's log line silenced.
function mockModelWithSpend(): FakeNeonHttp {
  vi.stubEnv("TUTOR_MODEL", "mock");
  vi.stubEnv("ANTHROPIC_API_KEY", undefined);
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [{ name: "micro_usd", type: "int4" }],
    rows: [["1"]],
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  vi.spyOn(console, "info").mockImplementation(() => {
    // The meter's diagnostics line; the test reads the stored cost.
  });
  return neonHttp;
}

// The API key header of the request Claude's model sends, answered with 401
// so nothing reaches Anthropic.
async function sentApiKey(): Promise<string | null> {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response("{}", { status: HTTP_STATUS.unauthorized })),
  );
  vi.stubGlobal("fetch", fetchMock);
  await tutorModel(GRANT)
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

    const model = tutorModel(GRANT);

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
      tutorModel(GRANT);
    } catch (error) {
      failure = error;
    }

    spyOnErrorLog();
    expect(toAppError(failure, "tutorModel").errorCase).toBe("invalid-api-key");
  });
});

describe("tutorModel with TUTOR_MODEL=mock", () => {
  test("uses the mock model, with no API key", () => {
    vi.stubEnv("TUTOR_MODEL", "mock");
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);

    expect(tutorModel(GRANT).provider).toBe("mock");
  });
});

describe("chatNameModel", () => {
  test("uses Claude Haiku through the Anthropic provider", () => {
    vi.stubEnv("TUTOR_MODEL", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");

    const model = chatNameModel(GRANT);

    expect(CHAT_NAME_MODEL_ID).toMatch(HAIKU_MODEL);
    expect(model.modelId).toBe(CHAT_NAME_MODEL_ID);
    expect(model.provider).toMatch(ANTHROPIC_PROVIDER);
  });

  test("uses the mock with TUTOR_MODEL=mock, which names a chat from its first message", async () => {
    mockModelWithSpend();

    const { text } = await generateText({
      model: chatNameModel(GRANT),
      messages: [
        { role: "user", content: "Bevel a donut" },
        { role: "assistant", content: "Press Ctrl+B." },
        { role: "user", content: "Name this chat." },
      ],
    });

    expect(text).toBe("Bevel a donut (2 messages)");
  });
});

describe("every model", () => {
  test("is made only from a quota grant, never from a bare user id", () => {
    // Type-checked, never run: a caller that skips checkQuota has no grant,
    // so it cannot make a model and its calls cannot start.
    function madeUnchecked(): unknown[] {
      return [
        // @ts-expect-error A model needs checkQuota's grant, not only its owner.
        tutorModel(OWNER),
        // @ts-expect-error A model needs checkQuota's grant, not only its owner.
        chatNameModel(OWNER),
      ];
    }

    expect(madeUnchecked).toBeTypeOf("function");
  });
});

describe("every model call", () => {
  test("is charged to its owner's month at the Claude model's prices, the mock's too", async () => {
    const neonHttp = mockModelWithSpend();

    await streamText({
      model: tutorModel(GRANT),
      messages: [{ role: "user", content: "Bevel a donut" }],
    }).consumeStream();

    // The mock's 1 input token at $2 and 1 output token at $10 per million
    // tokens: 12 micro-USD.
    const [upsert] = neonHttp.queries;
    expect(upsert?.query).toContain('insert into "monthly_spend"');
    expect(upsert?.params).toEqual([
      OWNER,
      expect.stringMatching(FIRST_OF_A_MONTH),
      "12",
    ]);
  });

  test("starts with the user: a chat that opens with the tutor gets the neutral kickoff first", async () => {
    mockModelWithSpend();

    const { text } = await generateText({
      model: chatNameModel(GRANT),
      messages: [
        { role: "assistant", content: "What would you like to make?" },
        { role: "user", content: "Bevel a donut" },
        { role: "assistant", content: "Press Ctrl+B." },
        { role: "user", content: "Name this chat." },
      ],
    });

    // The mock names it after her first message, which follows the opening
    // only when the neutral kickoff comes first.
    expect(text).toBe("Bevel a donut (3 messages)");
  });
});
