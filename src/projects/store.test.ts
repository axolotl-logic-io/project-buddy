// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { createProject, getProject, listProjects } from "@/projects/store.ts";

const calls: [string, () => Promise<unknown>][] = [
  ["listProjects", (): Promise<unknown> => listProjects()],
  ["getProject", (): Promise<unknown> => getProject("not-a-uuid")],
  ["createProject", (): Promise<unknown> => createProject("Low-poly fox")],
];

describe("project store", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
    vi.stubGlobal(
      "fetch",
      fakeNeonHttp({
        kind: "postgres-error",
        code: "22P02",
        message: 'invalid input syntax for type uuid: "not-a-uuid"',
      }).fetch,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test.each(calls)(
    "%s rejects with a logged AppError when Postgres rejects the query",
    async (operation, call) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {
        // The test reads the calls; the output would only be noise.
      });

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toHaveProperty("errorCase", "database-query-failed");
      expect(log).toHaveBeenCalledWith(
        `[app-error] database-query-failed in ${operation}`,
        expect.any(String),
      );
    },
  );
});
