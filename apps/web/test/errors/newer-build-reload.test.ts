import { describe, expect, test, vi } from "vitest";
import {
  RELOAD_WINDOW_MS,
  reloadForNewerBuild,
} from "@/errors/newer-build-reload.ts";

const START = Date.parse("2026-10-13T12:00:00.000Z");

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const items = new Map<string, string>();
  return {
    getItem: (key: string): string | null => items.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      items.set(key, value);
    },
  };
}

describe("reloadForNewerBuild", () => {
  test("reloads once and stamps the reload first", () => {
    const storage = memoryStorage();
    const reload = vi.fn<() => void>(() => {
      expect(storage.getItem("newer-build-reload")).toBe(String(START));
    });

    expect(reloadForNewerBuild(storage, reload, () => START)).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  test("doesn't reload again within the window", () => {
    const storage = memoryStorage();
    const reload = vi.fn<() => void>();
    reloadForNewerBuild(storage, reload, () => START);

    expect(
      reloadForNewerBuild(storage, reload, () => START + RELOAD_WINDOW_MS - 1),
    ).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  test("reloads again once the window has passed", () => {
    const storage = memoryStorage();
    const reload = vi.fn<() => void>();
    reloadForNewerBuild(storage, reload, () => START);

    expect(
      reloadForNewerBuild(storage, reload, () => START + RELOAD_WINDOW_MS),
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  test("doesn't reload without storage to stamp", () => {
    const reload = vi.fn<() => void>();

    expect(reloadForNewerBuild(null, reload, () => START)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
