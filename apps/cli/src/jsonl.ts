// The records one invocation writes to stdout: one JSON object per line,
// each with the schema version, its type, the command, the request ID and
// its place in the invocation's output. Whatever happens, an invocation
// ends with exactly one result or error record.

import type { Problem } from "./problems.ts";

const SCHEMA_VERSION = 1;

// Writes an invocation's records in order.
interface RecordWriter {
  // One entry of a list.
  item: (data: unknown) => void;
  // The invocation's success: one record's data, or a list's count with
  // anything else the list has.
  result: (fields: Readonly<Record<string, unknown>>) => void;
  // The invocation's failure.
  error: (problem: Problem) => void;
}

// A writer for the command's records, given to write as whole lines. Once
// the result or error is written, later records are dropped.
function recordWriter(
  command: string,
  requestId: string,
  write: (line: string) => void,
): RecordWriter {
  let sequence = 0;
  let ended = false;
  function record(
    type: "item" | "result" | "error",
    fields: Readonly<Record<string, unknown>>,
  ): void {
    if (ended) {
      return;
    }
    sequence += 1;
    write(
      `${JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        type,
        command,
        requestId,
        sequence,
        ...fields,
      })}\n`,
    );
  }
  return {
    item: (data: unknown): void => {
      record("item", { data });
    },
    result: (fields: Readonly<Record<string, unknown>>): void => {
      record("result", fields);
      ended = true;
    },
    error: (problem: Problem): void => {
      record("error", { error: problem });
      ended = true;
    },
  };
}

// A new ID for an invocation's request.
function newRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

export type { RecordWriter };
export { newRequestId, recordWriter };
