// The link a check-in email holds to turn the project's check-ins off. It
// names the owner and the project, signed with SESSION_SECRET, so it works
// without signing in, for that project alone, and never expires. Opening it
// only shows a page; turning check-ins off takes a confirmation there, so a
// mail scanner that opens the link changes nothing.
import { constantTimeEqual, hmacSha256 } from "@/auth/hmac.ts";
import { readSessionSecret } from "@/env.ts";
import {
  type ProjectId,
  parseProjectId,
  parseUserId,
  type UserId,
} from "@/ids.ts";

// The path of the page the link opens.
const CHECK_INS_OFF_PATH = "/check-ins/off";

// The owner's project whose check-ins a link turns off.
interface CheckInsOffTarget {
  readonly owner: UserId;
  readonly projectId: ProjectId;
}

async function signature({
  owner,
  projectId,
}: CheckInsOffTarget): Promise<string> {
  const digest = await hmacSha256(
    readSessionSecret(),
    `check-ins-off.${owner}.${projectId}`,
  );
  return Buffer.from(digest).toString("base64url");
}

// The link, on origin, that turns off the check-ins of target.
async function checkInsOffUrl(
  origin: string,
  target: CheckInsOffTarget,
): Promise<string> {
  const url = new URL(CHECK_INS_OFF_PATH, origin);
  url.searchParams.set("user", target.owner);
  url.searchParams.set("project", target.projectId);
  url.searchParams.set("token", await signature(target));
  return url.href;
}

// The target a link's parameters name, or undefined unless they are well
// formed and signed.
async function readCheckInsOffLink(parameters: {
  readonly user: unknown;
  readonly project: unknown;
  readonly token: unknown;
}): Promise<CheckInsOffTarget | undefined> {
  const { user, project, token } = parameters;
  if (
    typeof user !== "string" ||
    typeof project !== "string" ||
    typeof token !== "string"
  ) {
    return undefined;
  }
  const owner = parseUserId(user);
  const projectId = parseProjectId(project);
  if (owner === undefined || projectId === undefined) {
    return undefined;
  }
  const target = { owner, projectId };
  if (!(await constantTimeEqual(token, await signature(target)))) {
    return undefined;
  }
  return target;
}

export type { CheckInsOffTarget };
export { CHECK_INS_OFF_PATH, checkInsOffUrl, readCheckInsOffLink };
