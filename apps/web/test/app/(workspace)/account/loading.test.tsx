import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import AccountLoading from "@/app/(workspace)/account/loading.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

describe("Account loading", () => {
  test("says it is loading this month's usage while the page streams in", () => {
    render(<AccountLoading />);

    expect(screen.getByText(ACCOUNT_COPY.loading)).toBeInTheDocument();
  });
});
