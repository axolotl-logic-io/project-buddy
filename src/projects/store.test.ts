// @vitest-environment node
import { NeonDbError } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it as test,
  vi,
} from "vitest";
import { AppError } from "@/errors/app-error.ts";
import { createProject, getProject, listProjects } from "@/projects/store.ts";

// Stands in for the Neon HTTP client so each query can fail as Neon fails.
const neonQuery =
  vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();

vi.mock("@/db/client", () => ({
  getDb: () => drizzle({ client: neonQuery as never }),
}));

const calls: [string, () => Promise<unknown>][] = [
  ["listProjects", () => listProjects()],
  ["getProject", () => getProject("not-a-uuid")],
  ["createProject", () => createProject("Low-poly fox")],
];

describe("project store", () => {
  beforeEach(() => {
    neonQuery.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each(calls)(
    "%s rejects with a logged AppError when Postgres rejects the query",
    async (operation, call) => {
      const postgresError = new NeonDbError(
        'invalid input syntax for type uuid: "not-a-uuid"',
      );
      postgresError.code = "22P02";
      neonQuery.mockRejectedValue(postgresError);

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).errorCase).toBe("database-query-failed");
      expect(console.error).toHaveBeenCalledWith(
        `[app-error] database-query-failed in ${operation}`,
        expect.any(String),
      );
    },
  );
});
