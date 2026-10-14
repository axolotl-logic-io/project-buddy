// Why an email wasn't sent, sorted by what to do about it, as Resend's
// error reference sorts its errors:
// - retryable: Resend or the network failed for now; asking again may work.
// - quota: the Resend account's daily or monthly sending quota is used up.
// - configuration: the API key or the sending domain is wrong in Resend or
//   in Vercel.
// - our-bug: the site sent a request Resend rejects, or misread its answer.
type EmailProblem = "retryable" | "quota" | "configuration" | "our-bug";

// A failure to send an email, with its problem. The message holds the
// status and error name Resend answered with, and never an address.
class EmailFailure extends Error {
  readonly problem: EmailProblem;

  constructor(
    message: string,
    {
      problem,
      cause,
    }: { readonly problem: EmailProblem; readonly cause?: unknown },
  ) {
    super(message, { cause });
    this.name = "EmailFailure";
    this.problem = problem;
  }
}

export type { EmailProblem };
export { EmailFailure };
