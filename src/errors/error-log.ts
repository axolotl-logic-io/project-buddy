// The app's error log: one line per failure, written to the console's error
// stream, which is where Vercel collects function logs. The only module that
// writes to the console.
import type { AppErrorCase } from "@/errors/app-error.ts";
import { describeError } from "@/errors/describe-error.ts";

// Logs `error` as `[app-error] <case> in <operation>` followed by its
// details as JSON, without prompts, query parameters or secrets.
export function logAppError(
  errorCase: AppErrorCase,
  operation: string,
  error: unknown,
): void {
  console.error(
    `[app-error] ${errorCase} in ${operation}`,
    JSON.stringify(describeError(error)),
  );
}
