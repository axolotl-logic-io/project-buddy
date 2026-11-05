import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DeletionFeedback } from "@/components/deletion-feedback.tsx";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

test("deletion destination announces completion and receives keyboard focus", async () => {
  await render(<DeletionFeedback completed={true} />);
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent(PROMPT_COPY.deleted);
  await expect.element(page.getByRole("status")).toHaveFocus();
});
