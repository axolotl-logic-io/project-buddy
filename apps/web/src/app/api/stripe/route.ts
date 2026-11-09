import { receiveBatteryWebhook } from "@/batteries/purchases.ts";
import { logAppError } from "@/errors/error-log.ts";
import { HTTP_STATUS } from "@/http-status.ts";

export async function POST(request: Request): Promise<Response> {
  try {
    const result = await receiveBatteryWebhook(
      await request.text(),
      request.headers.get("stripe-signature") ?? "",
    );
    if (result === "invalid") {
      return new Response(null, { status: HTTP_STATUS.badRequest });
    }
    return new Response(null, { status: HTTP_STATUS.ok });
  } catch {
    // Do not log Stripe exceptions: they can include payment payloads.
    logAppError(
      "unknown",
      "stripe-webhook",
      new Error("Battery webhook failed; replay required."),
    );
    return new Response(null, { status: HTTP_STATUS.internalServerError });
  }
}
