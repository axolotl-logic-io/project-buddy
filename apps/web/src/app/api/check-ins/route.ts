import { linkOrigin } from "@/accounts/emailed-link.ts";
import { constantTimeEqual } from "@/auth/hmac.ts";
import { runCheckIns } from "@/check-ins/check-ins.ts";
import { readCronSecretIfSet } from "@/env.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";

// Whether the request carries the scheduler's secret, as Vercel Cron sends
// it. With no CRON_SECRET set, no request does.
function fromScheduler(request: Request): Promise<boolean> {
  const secret = readCronSecretIfSet();
  if (secret === undefined) {
    return Promise.resolve(false);
  }
  return constantTimeEqual(
    request.headers.get("authorization") ?? "",
    `Bearer ${secret}`,
  );
}

// The longest a run may take, in seconds: Vercel Hobby's maximum.
export const maxDuration = 300;

// The scheduler's run of the constructs' check-ins (src/check-ins/), which
// vercel.json's cron calls. It answers how many due projects it started,
// skipped and failed to check in on. A request without the scheduler's
// secret answers 401 and starts nothing. Running it again soon after
// starts no second check-in. A failure to list the due projects is logged
// once and answers 500 with its case.
export async function GET(request: Request): Promise<Response> {
  if (!(await fromScheduler(request))) {
    return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
  }
  try {
    return Response.json(await runCheckIns(linkOrigin(request.headers)));
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "check-ins").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}
