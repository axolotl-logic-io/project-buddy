// For tests of a streamed reply: readers for a UI message stream's body, as
// the browser receives it.
import { z } from "zod";

const STREAM_DATA_PREFIX = "data: ";
const STREAM_CHUNK = z.looseObject({ type: z.string() });
// The chunks of a UI message stream body.
function streamChunks(body: string): z.infer<typeof STREAM_CHUNK>[] {
  return body
    .split("\n")
    .filter((line) => line.startsWith(`${STREAM_DATA_PREFIX}{`))
    .map((line) =>
      STREAM_CHUNK.parse(JSON.parse(line.slice(STREAM_DATA_PREFIX.length))),
    );
}

export { streamChunks };
