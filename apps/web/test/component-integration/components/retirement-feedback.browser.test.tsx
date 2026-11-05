import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";

test("retirement destination announces completion and receives keyboard focus", async () => {
  await render(<RetirementFeedback completed={true} />);
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent(RETIREMENT_COPY.retired);
  await expect.element(page.getByRole("status")).toHaveFocus();
});
