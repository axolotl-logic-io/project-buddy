import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LocalTime } from "@/components/local-time.tsx";

// 20:16 on October 12 in New York (EDT), and already October 13 in UTC.
const EVENING_IN_NEW_YORK = new Date("2026-10-13T00:16:00Z");
const INSTANT = "2026-10-13T00:16:00.000Z";
const IN_UTC = "Oct 13, 2026, 12:16 AM";
const IN_NEW_YORK = "Oct 12, 2026, 08:16 PM";

// The element the server renders for the time, in a container in the page.
function serverRendered(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = renderToString(
    <LocalTime dateTime={EVENING_IN_NEW_YORK} detail="minute" />,
  );
  document.body.append(container);
  return container;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("LocalTime", () => {
  test("renders on the server in UTC, unseen, keeping its room", () => {
    vi.stubEnv("TZ", "America/New_York");

    serverRendered();

    const time = screen.getByText(IN_UTC);
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", INSTANT);
  });

  test("shows the browser's time once hydrated, with no mismatch", () => {
    vi.stubEnv("TZ", "America/New_York");
    const errors = vi.spyOn(console, "error");

    render(<LocalTime dateTime={EVENING_IN_NEW_YORK} detail="minute" />, {
      container: serverRendered(),
      hydrate: true,
    });

    const time = screen.getByText(IN_NEW_YORK);
    expect(time).toHaveAttribute("datetime", INSTANT);
    expect(errors).not.toHaveBeenCalled();
  });

  test("shows the browser's time when rendered in the browser", () => {
    vi.stubEnv("TZ", "Asia/Tokyo");

    render(<LocalTime dateTime={EVENING_IN_NEW_YORK} detail="day" />);
    expect(screen.getByText("Oct 13, 2026")).toBeInTheDocument();
  });
});
