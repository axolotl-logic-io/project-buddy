// The session of a server test: the cookies its request carries. The setup
// file (vitest.server-setup.ts) serves sessionCookies() as next/headers'
// `cookies()`, so src/auth/current-user.ts runs unmocked, and
// requestWithSession makes a route handler's request carry the same cookies.
// What code under test sets or deletes through `cookies()` is what later
// reads see. Each test starts signed out, with no cookies.
import type { User } from "@/accounts/users-store.ts";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";

// A cookie as `cookies().get` returns it.
interface TestCookie {
  readonly name: string;
  readonly value: string;
}

// The part of Next's cookie store that the app calls.
interface TestCookieStore {
  readonly get: (name: string) => TestCookie | undefined;
  readonly set: (cookie: TestCookie) => void;
  readonly delete: (name: string) => void;
}

// The test's cookies, by name.
const jar = new Map<string, string>();

const store: TestCookieStore = {
  get: (name: string): TestCookie | undefined => {
    const value = jar.get(name);
    if (value === undefined) {
      return undefined;
    }
    return { name, value };
  },
  set: ({ name, value }: TestCookie): void => {
    jar.set(name, value);
  },
  delete: (name: string): void => {
    jar.delete(name);
  },
};

// The cookie store that next/headers' `cookies()` returns in server tests.
function sessionCookies(): Promise<TestCookieStore> {
  return Promise.resolve(store);
}

// Signs user in, with a session token like the one signing in issues.
async function signIn(user: User): Promise<void> {
  jar.set(
    SESSION_COOKIE_NAME,
    await createSessionToken(user, readSessionSecret(), new Date()),
  );
}

// Gives the test user's session, signed properly but expired long ago.
async function lapsed(user: User): Promise<void> {
  jar.set(
    SESSION_COOKIE_NAME,
    await createSessionToken(user, readSessionSecret(), new Date(0)),
  );
}

// Signs the test out: its requests carry no session.
function signOut(): void {
  jar.delete(SESSION_COOKIE_NAME);
}

// Forgets every cookie, as a new visitor has none. The setup file calls it
// after each test.
function clearCookies(): void {
  jar.clear();
}

// A request to url, as fetch would send it with init, that carries the
// test's cookies, session included, in its Cookie header.
function requestWithSession(url: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  if (cookie !== "") {
    headers.set("cookie", cookie);
  }
  return new Request(url, { ...init, headers });
}

export type { TestCookie, TestCookieStore };
export {
  clearCookies,
  lapsed,
  requestWithSession,
  sessionCookies,
  signIn,
  signOut,
};
