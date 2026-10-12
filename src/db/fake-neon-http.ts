// A stand-in for Neon's HTTP endpoint, for tests. Stub the global fetch with
// `fetch` and the real driver sends its queries here, so tests run every layer
// down to the wire without a database or any cast. It answers single queries
// and batches (`db.batch`), which the endpoint runs as one transaction.
import { z } from "zod";

// One query as the Neon HTTP driver sends it.
interface NeonHttpQuery {
  readonly query: string;
  readonly params: readonly unknown[];
}

// Postgres type ids of the columns the fake can return.
const COLUMN_TYPE_IDS = {
  bool: 16,
  int4: 23,
  text: 25,
  timestamptz: 1184,
  // text[], which Postgres sends as an array literal such as {a,b}.
  _text: 1009,
} as const;

interface NeonColumn {
  readonly name: string;
  readonly type: keyof typeof COLUMN_TYPE_IDS;
}

// How the endpoint answers every query: with rows (each value as the text
// Postgres sends), with a Postgres error, or not at all.
type NeonHttpAnswer =
  | {
      readonly kind: "rows";
      readonly columns: readonly NeonColumn[];
      readonly rows: readonly (readonly (string | null)[])[];
    }
  | {
      readonly kind: "postgres-error";
      readonly code: string;
      readonly message: string;
    }
  | { readonly kind: "unreachable" };

interface FakeNeonHttp {
  readonly fetch: typeof fetch;
  // Every query received, in order, whether alone or in a batch.
  readonly queries: readonly NeonHttpQuery[];
  // Every batch received, in order, each as its queries.
  readonly batches: readonly (readonly NeonHttpQuery[])[];
}

const QUERY_BODY = z.object({
  query: z.string(),
  params: z.array(z.unknown()),
});

const BATCH_BODY = z.object({ queries: z.array(QUERY_BODY) });

const HTTP_BAD_REQUEST = 400;

// The endpoint's answer to a request whose queries got answers: their
// results, or the first failure, which fails the whole request as it rolls
// back a batch. A single query's result is the body itself.
function respond(
  answers: readonly NeonHttpAnswer[],
  isBatch: boolean,
): Promise<Response> {
  const results: unknown[] = [];
  for (const answer of answers) {
    switch (answer.kind) {
      case "rows":
        results.push({
          fields: answer.columns.map(({ name, type }) => ({
            name,
            dataTypeID: COLUMN_TYPE_IDS[type],
          })),
          rows: answer.rows,
          rowCount: answer.rows.length,
          command: "SELECT",
        });
        break;
      case "postgres-error":
        return Promise.resolve(
          Response.json(
            { message: answer.message, code: answer.code, severity: "ERROR" },
            { status: HTTP_BAD_REQUEST },
          ),
        );
      case "unreachable":
        return Promise.reject(new TypeError("fetch failed"));
      default:
        return answer satisfies never;
    }
  }
  if (isBatch) {
    return Promise.resolve(Response.json({ results }));
  }
  return Promise.resolve(Response.json(results[0]));
}

// A connection string the driver accepts. Nothing listens at it. The
// credentials are placeholders the driver requires.
function fakeDatabaseUrl(): string {
  const url = new URL("postgresql://db.example/app");
  url.username = "app";
  url.password = "placeholder";
  return url.href;
}

export const FAKE_DATABASE_URL = fakeDatabaseUrl();

export type { FakeNeonHttp, NeonHttpAnswer, NeonHttpQuery };

// The endpoint, answering the first query it receives with firstAnswer, the
// next ones with laterAnswers in order, and every query after those with the
// last answer given. Each query in a batch takes the next answer.
export function fakeNeonHttp(
  firstAnswer: NeonHttpAnswer,
  ...laterAnswers: readonly NeonHttpAnswer[]
): FakeNeonHttp {
  const answers = [firstAnswer, ...laterAnswers];
  const queries: NeonHttpQuery[] = [];
  const batches: NeonHttpQuery[][] = [];
  function nextAnswer(): NeonHttpAnswer {
    return answers[Math.min(queries.length, answers.length) - 1] ?? firstAnswer;
  }
  function answerQuery(query: NeonHttpQuery): NeonHttpAnswer {
    queries.push(query);
    return nextAnswer();
  }
  function neonFetch(
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const body: unknown = JSON.parse(String(init?.body));
    const batch = BATCH_BODY.safeParse(body);
    if (batch.success) {
      batches.push(batch.data.queries);
      return respond(batch.data.queries.map(answerQuery), true);
    }
    return respond([answerQuery(QUERY_BODY.parse(body))], false);
  }
  return { fetch: neonFetch, queries, batches };
}
