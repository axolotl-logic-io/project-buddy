// A stand-in for Neon's HTTP endpoint, for tests. Stub the global fetch with
// `fetch` and the real driver sends its queries here, so tests run every layer
// down to the wire without a database or any cast.
import { z } from "zod";

// One query as the Neon HTTP driver sends it.
interface NeonHttpQuery {
  readonly query: string;
  readonly params: readonly unknown[];
}

// Postgres type ids of the columns the fake can return.
const COLUMN_TYPE_IDS = { int4: 23, text: 25, timestamptz: 1184 } as const;

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
  // Every query received, in order.
  readonly queries: readonly NeonHttpQuery[];
}

const QUERY_BODY = z.object({
  query: z.string(),
  params: z.array(z.unknown()),
});

const HTTP_BAD_REQUEST = 400;
// The name Neon's wire format gives a column's Postgres type id.
const TYPE_ID_FIELD = "dataTypeID";

function respond(answer: NeonHttpAnswer): Promise<Response> {
  switch (answer.kind) {
    case "rows":
      return Promise.resolve(
        Response.json({
          fields: answer.columns.map(({ name, type }) => ({
            name,
            [TYPE_ID_FIELD]: COLUMN_TYPE_IDS[type],
          })),
          rows: answer.rows,
          rowCount: answer.rows.length,
          command: "SELECT",
        }),
      );
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

export function fakeNeonHttp(answer: NeonHttpAnswer): FakeNeonHttp {
  const queries: NeonHttpQuery[] = [];
  function neonFetch(
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    queries.push(QUERY_BODY.parse(JSON.parse(String(init?.body))));
    return respond(answer);
  }
  return { fetch: neonFetch, queries };
}
