import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { recordVisitAction } from "@/visits/record-visit-action.ts";
import { SignedInVisits } from "@/visits/signed-in-visits.tsx";

const THREE_VISITING_DATES = 3;

const navigation = vi.hoisted(() => ({
  pathname: "/profile",
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: (): string => navigation.pathname,
  useRouter: (): { refresh: () => void } => ({ refresh: navigation.refresh }),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T23:59:59.999Z"));
  vi.mocked(recordVisitAction).mockReset().mockResolvedValue("known");
  navigation.refresh.mockClear();
  navigation.pathname = "/profile";
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("a visible visit records once, refreshes its new total and ignores same-day activity", async () => {
  vi.mocked(recordVisitAction).mockResolvedValue("added");
  const screen = await render(<SignedInVisits />);
  expect(navigation.refresh).toHaveBeenCalledTimes(1);
  document.dispatchEvent(new Event("pointerdown"));
  document.dispatchEvent(new Event("keydown"));
  globalThis.dispatchEvent(new Event("focus"));
  navigation.pathname = "/quests";
  await screen.rerender(<SignedInVisits />);
  expect(recordVisitAction).toHaveBeenCalledTimes(1);
});

test("hidden mounting and background renders do not record, but returning with the same session does", async () => {
  const visibility = vi.spyOn(document, "visibilityState", "get");
  visibility.mockReturnValue("hidden");
  const screen = await render(<SignedInVisits />);
  expect(recordVisitAction).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  await Promise.resolve();
  expect(recordVisitAction).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue("hidden");
  vi.setSystemTime(new Date("2026-11-02T00:00:00Z"));
  await screen.rerender(<SignedInVisits />);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(recordVisitAction).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  await Promise.resolve();
  expect(recordVisitAction).toHaveBeenCalledTimes(2);
});

test("an idle foreground page counts the next date only on interaction or navigation", async () => {
  const screen = await render(<SignedInVisits />);
  await Promise.resolve();
  expect(recordVisitAction).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date("2026-11-02T00:00:00Z"));
  await screen.rerender(<SignedInVisits />);
  expect(recordVisitAction).toHaveBeenCalledTimes(1);
  document.dispatchEvent(new Event("keydown"));
  await Promise.resolve();
  expect(recordVisitAction).toHaveBeenCalledTimes(2);
  vi.setSystemTime(new Date("2026-11-03T00:00:00Z"));
  navigation.pathname = "/quests";
  await screen.rerender(<SignedInVisits />);
  await Promise.resolve();
  expect(recordVisitAction).toHaveBeenCalledTimes(THREE_VISITING_DATES);
});

test("in-flight visits deduplicate and a failed report retries on the next foreground event", async () => {
  const answer =
    Promise.withResolvers<Awaited<ReturnType<typeof recordVisitAction>>>();
  vi.mocked(recordVisitAction).mockReturnValueOnce(answer.promise);
  await render(<SignedInVisits />);
  document.dispatchEvent(new Event("pointerdown"));
  expect(recordVisitAction).toHaveBeenCalledTimes(1);
  answer.resolve("unavailable");
  await answer.promise;
  document.dispatchEvent(new Event("keydown"));
  await Promise.resolve();
  expect(recordVisitAction).toHaveBeenCalledTimes(2);
  expect(navigation.refresh).not.toHaveBeenCalled();
});

test("a report completing during navigation still refreshes the saved total", async () => {
  const answer =
    Promise.withResolvers<Awaited<ReturnType<typeof recordVisitAction>>>();
  vi.mocked(recordVisitAction).mockReturnValueOnce(answer.promise);
  const screen = await render(<SignedInVisits />);
  navigation.pathname = "/quests";
  await screen.rerender(<SignedInVisits />);
  answer.resolve("added");
  await answer.promise;
  expect(navigation.refresh).toHaveBeenCalledTimes(1);
  expect(recordVisitAction).toHaveBeenCalledTimes(1);
});

test.each(["/login", "/signup", "/login/link"])(
  "the authentication page %s cannot report a failed sign-in as a visit",
  async (pathname) => {
    navigation.pathname = pathname;
    await render(<SignedInVisits />);
    document.dispatchEvent(new Event("pointerdown"));
    expect(recordVisitAction).not.toHaveBeenCalled();
  },
);
