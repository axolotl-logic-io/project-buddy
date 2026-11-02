// A fake push service and fake browsers, for the push notification server
// tests. The fake push service is an HTTP server on loopback, which the site
// reaches as it reaches a real one, once PUSH_ENDPOINTS is "loopback". A
// fake browser has its own push subscription with real keys, so it decrypts
// what the site sent it exactly as a browser does (RFC 8291's aes128gcm).
import {
  createDecipheriv,
  createECDH,
  type ECDH,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { z } from "zod";

// One request the fake push service got for a browser: whether it took the
// notification, or answered that the subscription is gone or with a
// redirect.
interface ReceivedPush {
  readonly accepted: boolean;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: Buffer;
}

// What a browser gets from the site: a notification's title, text and the
// page it opens.
interface ShownNotification {
  readonly title: string;
  readonly body: string;
  readonly url: string;
}

interface FakePushService {
  // A new browser of this service's, with no notifications yet.
  readonly browser: () => FakeBrowser;
  readonly close: () => Promise<void>;
}

interface FakeBrowser {
  // What PushSubscription.toJSON() gives in this browser.
  readonly subscription: {
    readonly endpoint: string;
    readonly expirationTime: null;
    readonly keys: { readonly p256dh: string; readonly auth: string };
  };
  // Every notification the site sent this browser, decrypted, in order.
  readonly notifications: () => readonly ShownNotification[];
  // Every request the push service got for this browser, as sent, those it
  // refused as gone included.
  readonly received: () => readonly ReceivedPush[];
  // From now on, the push service answers for this browser that its
  // subscription is gone.
  readonly unsubscribeAtService: () => void;
  // From now on, the push service answers for this browser with a redirect
  // to location, as a forged endpoint on an attacker's server might.
  readonly redirectAtServiceTo: (location: string) => void;
}

const SHOWN = z.object({
  title: z.string(),
  body: z.string(),
  url: z.string(),
});

const CREATED = 201;
const GONE = 410;
// See Other: fetch, when it follows redirects, asks the location again with
// a GET, so following it would reach wherever the location points.
const SEE_OTHER = 303;
const NOT_FOUND = 404;
const SALT_LENGTH = 16;
const RECORD_SIZE_LENGTH = 4;
const TAG_LENGTH = 16;
const AUTH_SECRET_LENGTH = 16;
const KEY_LENGTH = 16;
const NONCE_LENGTH = 12;
const IKM_LENGTH = 32;
// The padding delimiter that ends the one and last record (RFC 8188).
const LAST_RECORD_DELIMITER = 2;
const PATH_PREFIX = "/push/";

// The plaintext of a single-record aes128gcm body, for the browser with
// these keys (RFC 8291, section 3.4).
function decrypt(body: Buffer, browserKeys: ECDH, authSecret: Buffer): string {
  const salt = body.subarray(0, SALT_LENGTH);
  const idLength = body.readUInt8(SALT_LENGTH + RECORD_SIZE_LENGTH);
  const headerLength = SALT_LENGTH + RECORD_SIZE_LENGTH + 1 + idLength;
  const serverPublicKey = body.subarray(headerLength - idLength, headerLength);
  const sharedSecret = browserKeys.computeSecret(serverPublicKey);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    browserKeys.getPublicKey(),
    serverPublicKey,
  ]);
  const ikm = Buffer.from(
    hkdfSync("sha256", sharedSecret, authSecret, keyInfo, IKM_LENGTH),
  );
  const key = Buffer.from(
    hkdfSync(
      "sha256",
      ikm,
      salt,
      Buffer.from("Content-Encoding: aes128gcm\0"),
      KEY_LENGTH,
    ),
  );
  const nonce = Buffer.from(
    hkdfSync(
      "sha256",
      ikm,
      salt,
      Buffer.from("Content-Encoding: nonce\0"),
      NONCE_LENGTH,
    ),
  );
  const record = body.subarray(headerLength);
  const decipher = createDecipheriv("aes-128-gcm", key, nonce);
  decipher.setAuthTag(record.subarray(record.length - TAG_LENGTH));
  const padded = Buffer.concat([
    decipher.update(record.subarray(0, record.length - TAG_LENGTH)),
    decipher.final(),
  ]);
  return padded
    .subarray(0, padded.lastIndexOf(LAST_RECORD_DELIMITER))
    .toString("utf8");
}

// The port a server listening on TCP took.
function portOf(address: AddressInfo | string | null): number {
  if (address === null || typeof address === "string") {
    throw new Error("The fake push service isn't listening on a TCP port.");
  }
  return address.port;
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Starts a fake push service on a free loopback port. Close it after the
// tests that use it.
async function startFakePushService(): Promise<FakePushService> {
  const pushes = new Map<string, ReceivedPush[]>();
  const gone = new Set<string>();
  const redirects = new Map<string, string>();

  async function answer(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const id = (request.url ?? "").slice(PATH_PREFIX.length);
    const body = await readBody(request);
    const received = pushes.get(id);
    if (received === undefined) {
      response.writeHead(NOT_FOUND).end();
      return;
    }
    const location = redirects.get(id);
    const accepted = !gone.has(id) && location === undefined;
    received.push({ accepted, headers: request.headers, body });
    if (location !== undefined) {
      response.writeHead(SEE_OTHER, { location }).end();
    } else if (accepted) {
      response.writeHead(CREATED).end();
    } else {
      response.writeHead(GONE).end();
    }
  }

  const server: Server = createServer((request, response) => {
    answer(request, response).catch(() => {
      response.destroy();
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = portOf(server.address());

  function browser(): FakeBrowser {
    const id = crypto.randomUUID();
    const keys = createECDH("prime256v1");
    keys.generateKeys();
    const authSecret = randomBytes(AUTH_SECRET_LENGTH);
    pushes.set(id, []);
    function received(): readonly ReceivedPush[] {
      return [...(pushes.get(id) ?? [])];
    }
    return {
      subscription: {
        endpoint: `http://127.0.0.1:${port}${PATH_PREFIX}${id}`,
        expirationTime: null,
        keys: {
          p256dh: keys.getPublicKey().toString("base64url"),
          auth: authSecret.toString("base64url"),
        },
      },
      received,
      notifications: () =>
        received()
          .filter(({ accepted }) => accepted)
          .map((push) =>
            SHOWN.parse(JSON.parse(decrypt(push.body, keys, authSecret))),
          ),
      redirectAtServiceTo: (location: string): void => {
        redirects.set(id, location);
      },
      unsubscribeAtService: (): void => {
        gone.add(id);
      },
    };
  }

  return {
    browser,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
        });
      }),
  };
}

export type { FakeBrowser, FakePushService, ShownNotification };
export { startFakePushService };
