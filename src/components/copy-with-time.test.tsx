import { render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";

const EVENING_IN_NEW_YORK = new Date("2026-10-13T00:16:00Z");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CopyWithTime: a copy text with a time in it", () => {
  test("puts the browser's time in the copy, where the slot is", () => {
    vi.stubEnv("TZ", "America/New_York");

    const { container } = render(
      <p>
        <CopyWithTime
          dateTime={EVENING_IN_NEW_YORK}
          detail="minute"
          text={MEMORY_COPY.versionMade("you", TIME_SLOT)}
        />
      </p>,
    );

    expect(container).toHaveTextContent(
      MEMORY_COPY.versionMade("you", "Oct 12, 2026, 8:16 PM"),
    );
  });

  test("keeps the copy after the slot", () => {
    vi.stubEnv("TZ", "America/New_York");

    const { container } = render(
      <p>
        <CopyWithTime
          dateTime={EVENING_IN_NEW_YORK}
          detail="day"
          text={`since ${TIME_SLOT}, and counting`}
        />
      </p>,
    );

    expect(container).toHaveTextContent("since Oct 12, 2026, and counting");
  });
});
