import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { IMAGE_COPY } from "@/ui/copy/images.ts";

const OPERATOR_DETAILS = /ANTHROPIC_API_KEY|Vercel|server logs/u;

test.each([
  "invalid-api-key",
  "invalid-request",
  "database-query-failed",
  "unknown",
])("%s gives user recovery without operator configuration", async (kind) => {
  await render(<ChatError error={new Error(kind)} />);
  const alert = page.getByRole("alert");
  await expect.element(alert).toBeVisible();
  expect(alert.element().textContent).not.toMatch(OPERATOR_DETAILS);
});
test.each(["request-too-large", "not-found"])(
  "%s offers no futile reply retry",
  async (kind) => {
    const retry = vi.fn();
    await render(<ChatError error={new Error(kind)} onRetry={retry} />);
    await expect
      .element(page.getByRole("button", { name: IMAGE_COPY.retry }))
      .not.toBeInTheDocument();
    expect(retry).not.toHaveBeenCalled();
  },
);
