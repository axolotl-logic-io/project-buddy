// A stand-in for Neon's WebSocket endpoint, for tests. Stub the global
// WebSocket with `webSocket` and the real Neon Pool, and drizzle on top of it,
// speak the Postgres wire protocol to this fake, so tests run every layer down
// to the wire without a database or any cast. It accepts any password, records
// each statement and answers it with success and no rows.

// One statement as the driver sent it, with each parameter as the text
// Postgres would receive.
interface PostgresStatement {
  readonly sql: string;
  readonly params: readonly (string | null)[];
}

interface FakeNeonWebSocket {
  // Stub the global WebSocket with this class.
  readonly webSocket: new (
    url: string,
  ) => EventTarget;
  // Every statement received, in order.
  readonly statements: readonly PostgresStatement[];
}

// A frontend message: its type byte, empty for the startup message, and its
// body after the length.
interface FrontendMessage {
  readonly type: string;
  readonly body: Uint8Array;
}

// Reads a message body field by field.
interface BodyReader {
  readonly cString: () => string;
  readonly int16: () => number;
  readonly int32: () => number;
  readonly text: (length: number) => string;
}

const TYPE_BYTES = 1;
const INT16_BYTES = 2;
const INT32_BYTES = 4;
const NULL_PARAMETER_LENGTH = -1;
const AUTHENTICATION_OK = 0;
const IDLE = "I";
const FIRST_WORD = /^\s*(?<word>\S+)/u;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function int32(value: number): Uint8Array {
  const bytes = new Uint8Array(INT32_BYTES);
  new DataView(bytes.buffer).setInt32(0, value);
  return bytes;
}

function backendMessage(
  type: string,
  body: Uint8Array = new Uint8Array(),
): ArrayBuffer {
  const message = new Uint8Array(TYPE_BYTES + INT32_BYTES + body.length);
  message.set(encoder.encode(type));
  message.set(int32(INT32_BYTES + body.length), TYPE_BYTES);
  message.set(body, TYPE_BYTES + INT32_BYTES);
  return message.buffer;
}

function cString(text: string): Uint8Array {
  return encoder.encode(`${text}\0`);
}

function bodyReader(body: Uint8Array): BodyReader {
  const view = new DataView(body.buffer, body.byteOffset, body.length);
  let offset = 0;
  function take(length: number): Uint8Array {
    const bytes = body.subarray(offset, offset + length);
    offset += length;
    return bytes;
  }
  return {
    cString(): string {
      const text = decoder.decode(take(body.indexOf(0, offset) - offset));
      take(1);
      return text;
    },
    int16(): number {
      const value = view.getInt16(offset);
      take(INT16_BYTES);
      return value;
    },
    int32(): number {
      const value = view.getInt32(offset);
      take(INT32_BYTES);
      return value;
    },
    text(length: number): string {
      return decoder.decode(take(length));
    },
  };
}

// The tag Postgres closes a statement with, such as "INSERT 0 0".
function commandTag(sql: string): string {
  const { word = "" } = FIRST_WORD.exec(sql)?.groups ?? {};
  const command = word.toUpperCase();
  if (command === "INSERT") {
    return "INSERT 0 0";
  }
  if (command === "DELETE") {
    return "DELETE 0";
  }
  return command;
}

// The text-format parameters of a Bind message.
function bindParams(body: Uint8Array): (string | null)[] {
  const reader = bodyReader(body);
  reader.cString();
  reader.cString();
  const formatCount = reader.int16();
  for (let format = 0; format < formatCount; format += 1) {
    reader.int16();
  }
  return Array.from({ length: reader.int16() }, () => {
    const length = reader.int32();
    if (length === NULL_PARAMETER_LENGTH) {
      return null;
    }
    return reader.text(length);
  });
}

// Splits the bytes a connection sends into whole messages, keeping a partial
// message until the rest arrives. The first message, the startup message, has
// no type byte.
function frontendMessages(): (chunk: Uint8Array) => FrontendMessage[] {
  let pending = new Uint8Array();
  let typeBytes = 0;
  return (chunk: Uint8Array): FrontendMessage[] => {
    const bytes = new Uint8Array(pending.length + chunk.length);
    bytes.set(pending);
    bytes.set(chunk, pending.length);
    const view = new DataView(bytes.buffer);
    const messages: FrontendMessage[] = [];
    let offset = 0;
    while (bytes.length - offset >= typeBytes + INT32_BYTES) {
      const end = offset + typeBytes + view.getInt32(offset + typeBytes);
      if (bytes.length < end) {
        break;
      }
      messages.push({
        type: decoder.decode(bytes.subarray(offset, offset + typeBytes)),
        body: bytes.subarray(offset + typeBytes + INT32_BYTES, end),
      });
      typeBytes = TYPE_BYTES;
      offset = end;
    }
    pending = bytes.slice(offset);
    return messages;
  };
}

// One connection's side of the protocol: takes what the driver sends and
// replies through `reply`, one backend message at a time.
function postgresConnection(
  statements: PostgresStatement[],
  reply: (message: ArrayBuffer) => void,
): (chunk: Uint8Array) => void {
  const split = frontendMessages();
  let sql = "";
  let params: (string | null)[] = [];
  function ready(): void {
    reply(backendMessage("Z", encoder.encode(IDLE)));
  }
  function complete(statement: PostgresStatement): void {
    statements.push(statement);
    reply(backendMessage("C", cString(commandTag(statement.sql))));
  }
  function answer({ type, body }: FrontendMessage): void {
    switch (type) {
      case "p":
        reply(backendMessage("R", int32(AUTHENTICATION_OK)));
        ready();
        break;
      case "Q":
        complete({ sql: bodyReader(body).cString(), params: [] });
        ready();
        break;
      case "P": {
        const reader = bodyReader(body);
        reader.cString();
        sql = reader.cString();
        reply(backendMessage("1"));
        break;
      }
      case "B":
        params = bindParams(body);
        reply(backendMessage("2"));
        break;
      case "D":
        reply(backendMessage("n"));
        break;
      case "E":
        complete({ sql, params });
        break;
      case "S":
        ready();
        break;
      default:
        // The startup message and Terminate need no answer.
        break;
    }
  }
  return (chunk: Uint8Array): void => {
    for (const message of split(chunk)) {
      answer(message);
    }
  };
}

export type { FakeNeonWebSocket, PostgresStatement };

export function fakeNeonWebSocket(): FakeNeonWebSocket {
  const statements: PostgresStatement[] = [];
  class FakeSocket extends EventTarget {
    binaryType = "arraybuffer";
    readonly #receive = postgresConnection(statements, (data) => {
      setTimeout(() => {
        this.dispatchEvent(new MessageEvent("message", { data }));
      }, 0);
    });

    constructor() {
      super();
      setTimeout(() => {
        this.dispatchEvent(new Event("open"));
      }, 0);
    }

    send(data: Uint8Array): void {
      this.#receive(data);
    }

    close(): void {
      this.dispatchEvent(new Event("close"));
    }
  }
  return { webSocket: FakeSocket, statements };
}
