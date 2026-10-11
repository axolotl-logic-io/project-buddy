// A stand-in for a git server's smart HTTP endpoint, for tests. Stub the
// global fetch with `fetch` and isomorphic-git clones from branches held in
// memory, so tests run the real client without a network, a disk or a git
// binary. It serves only what reindexing asks for, a shallow clone of one
// branch, and answers anything else with 400 Bad Request.
import {
  init,
  packObjects,
  type TreeEntry,
  writeBlob,
  writeCommit,
  writeTree,
} from "isomorphic-git";
import { createFsFromVolume, Volume } from "memfs";
import { HTTP_STATUS } from "@/http-status.ts";

// Branch names mapped to the files of the branch's one commit, keyed by path
// from the repository root, such as "manual/index.rst". The first branch is
// the default branch, which HEAD points at.
type GitBranches = Readonly<Record<string, Readonly<Record<string, string>>>>;

interface FakeGitHttp {
  readonly fetch: typeof fetch;
}

type SourceFs = ReturnType<typeof createFsFromVolume>;
type SourceFile = readonly [path: string, content: string];

// A tree in the object store: its id, and the ids of every object it holds,
// itself included.
interface WrittenTree {
  readonly oid: string;
  readonly objects: readonly string[];
}

// A branch's commit and every object a clone of it needs.
interface WrittenBranch {
  readonly name: string;
  readonly commit: string;
  readonly objects: readonly string[];
}

const SOURCE_DIR = "/source";
const SERVICE = "git-upload-pack";
const CAPABILITIES = "shallow side-band-64k";
const AUTHOR = {
  name: "Test",
  email: "test@example.com",
  timestamp: 0,
  timezoneOffset: 0,
};
const FILE_MODE = "100644";
const DIRECTORY_MODE = "040000";
const FLUSH_PACKET = "0000";
const PACKET_LENGTH_DIGITS = 4;
const HEXADECIMAL = 16;
// side-band-64k packets are at most 65,520 bytes, including the 4-byte length
// and the 1-byte channel.
const MAX_SIDE_BAND_DATA = 65_515;
const PACK_DATA_CHANNEL = Uint8Array.of(1);
const WANT_LINE = /want (?<oid>[0-9a-f]{40})/u;
const SHALLOW_REQUEST = "deepen 1\n";

const encoder = new TextEncoder();

// A pkt-line, the framing of git's wire protocol: the payload prefixed with
// its length, the prefix included, in four hexadecimal digits.
function packetLine(...payload: Uint8Array<ArrayBuffer>[]): Blob {
  const length = payload
    .reduce((total, part) => total + part.length, PACKET_LENGTH_DIGITS)
    .toString(HEXADECIMAL)
    .padStart(PACKET_LENGTH_DIGITS, "0");
  return new Blob([length, ...payload]);
}

function textPacket(text: string): Blob {
  return packetLine(encoder.encode(text));
}

// The packfile split into side-band packets on the pack data channel.
function packDataPackets(packfile: Uint8Array<ArrayBuffer>): Blob[] {
  return Array.from(
    { length: Math.ceil(packfile.length / MAX_SIDE_BAND_DATA) },
    (_, index) =>
      packetLine(
        PACK_DATA_CHANNEL,
        packfile.subarray(
          index * MAX_SIDE_BAND_DATA,
          (index + 1) * MAX_SIDE_BAND_DATA,
        ),
      ),
  );
}

// Writes the files as nested trees and returns the root tree.
async function writeFiles(
  fs: SourceFs,
  files: readonly SourceFile[],
): Promise<WrittenTree> {
  const blobs = await Promise.all(
    files
      .filter(([path]) => !path.includes("/"))
      .map(
        async ([path, content]): Promise<TreeEntry> => ({
          mode: FILE_MODE,
          path,
          type: "blob",
          oid: await writeBlob({
            fs,
            dir: SOURCE_DIR,
            blob: encoder.encode(content),
          }),
        }),
      ),
  );
  const nestedFiles = Map.groupBy(
    files.filter(([path]) => path.includes("/")),
    ([path]) => path.slice(0, path.indexOf("/")),
  );
  const directories = await Promise.all(
    [...nestedFiles].map(async ([directory, nested]) => ({
      directory,
      tree: await writeFiles(
        fs,
        nested.map(([path, content]) => [
          path.slice(directory.length + 1),
          content,
        ]),
      ),
    })),
  );
  const oid = await writeTree({
    fs,
    dir: SOURCE_DIR,
    tree: [
      ...blobs,
      ...directories.map(
        ({ directory, tree }): TreeEntry => ({
          mode: DIRECTORY_MODE,
          path: directory,
          type: "tree",
          oid: tree.oid,
        }),
      ),
    ],
  });
  return {
    oid,
    objects: [
      oid,
      ...blobs.map((blob) => blob.oid),
      ...directories.flatMap(({ tree }) => tree.objects),
    ],
  };
}

async function writeBranches(
  fs: SourceFs,
  branches: GitBranches,
): Promise<WrittenBranch[]> {
  await init({ fs, dir: SOURCE_DIR });
  return Promise.all(
    Object.entries(branches).map(async ([name, files]) => {
      const tree = await writeFiles(fs, Object.entries(files));
      const commit = await writeCommit({
        fs,
        dir: SOURCE_DIR,
        commit: {
          message: name,
          tree: tree.oid,
          parent: [],
          author: AUTHOR,
          committer: AUTHOR,
        },
      });
      return { name, commit, objects: [commit, ...tree.objects] };
    }),
  );
}

function badRequest(reason: string): Response {
  return new Response(reason, { status: HTTP_STATUS.badRequest });
}

function requestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) {
    return input.url;
  }
  return input.toString();
}

// The reference advertisement: HEAD with the server's capabilities, then every
// branch.
function advertiseRefs(branches: readonly WrittenBranch[]): Response {
  const [defaultBranch] = branches;
  if (defaultBranch === undefined) {
    throw new Error("fakeGitHttp needs at least one branch");
  }
  const head = textPacket(
    `${defaultBranch.commit} HEAD\u0000${CAPABILITIES} symref=HEAD:refs/heads/${defaultBranch.name}\n`,
  );
  const refs = branches.map(({ name, commit }) =>
    textPacket(`${commit} refs/heads/${name}\n`),
  );
  return new Response(
    new Blob([
      textPacket(`# service=${SERVICE}\n`),
      FLUSH_PACKET,
      head,
      ...refs,
      FLUSH_PACKET,
    ]),
    { headers: { "content-type": `application/x-${SERVICE}-advertisement` } },
  );
}

// Answers a request for a depth-1 clone of one branch with that branch's
// commit and its files. The commits have no parents, so no history is cut.
async function uploadPack(
  fs: SourceFs,
  branches: readonly WrittenBranch[],
  request: string,
): Promise<Response> {
  const groups = WANT_LINE.exec(request)?.groups;
  if (groups === undefined || !request.includes(SHALLOW_REQUEST)) {
    return badRequest("The fake serves only shallow clones of one branch.");
  }
  const { oid } = groups;
  const branch = branches.find(({ commit }) => commit === oid);
  if (branch === undefined) {
    return badRequest(`No branch points at ${String(oid)}.`);
  }
  const { packfile } = await packObjects({
    fs,
    dir: SOURCE_DIR,
    oids: [...branch.objects],
  });
  if (packfile === undefined) {
    throw new Error("packObjects returns the packfile unless asked to write");
  }
  return new Response(
    new Blob([
      FLUSH_PACKET,
      textPacket("NAK\n"),
      ...packDataPackets(packfile),
      FLUSH_PACKET,
    ]),
    { headers: { "content-type": `application/x-${SERVICE}-result` } },
  );
}

export type { FakeGitHttp, GitBranches };

// A git server at repositoryUrl holding the given branches.
export async function fakeGitHttp(
  repositoryUrl: string,
  branches: GitBranches,
): Promise<FakeGitHttp> {
  const fs = createFsFromVolume(new Volume());
  const written = await writeBranches(fs, branches);
  async function gitFetch(
    input: RequestInfo | URL,
    requestInit?: RequestInit,
  ): Promise<Response> {
    const url = requestUrl(input);
    if (url === `${repositoryUrl}/info/refs?service=${SERVICE}`) {
      return advertiseRefs(written);
    }
    if (
      url === `${repositoryUrl}/${SERVICE}` &&
      requestInit?.method === "POST"
    ) {
      return uploadPack(
        fs,
        written,
        await new Response(requestInit.body).text(),
      );
    }
    return badRequest(`Not a git request for ${repositoryUrl}: ${url}`);
  }
  return { fetch: gitFetch };
}
