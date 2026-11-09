import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import BookPage from "@/app/(workspace)/library/[book]/page.tsx";
import LibraryPage from "@/app/(workspace)/library/page.tsx";
import { LIBRARY_COPY } from "@/ui/copy/library.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
afterEach(cleanup);

describe("use_case_library", () => {
  test("offers every book", async () => {
    signInAs(SIGNED_IN_USER);
    await render(await LibraryPage());
    await expect
      .element(page.getByRole("heading", { name: "Library", exact: true }))
      .toBeVisible();
    await Promise.all(
      LIBRARY_COPY.books.map((book) =>
        expect
          .element(page.getByRole("link", { name: book.title, exact: true }))
          .toHaveAttribute("href", `/library/${book.id}`),
      ),
    );
  });
  for (const book of LIBRARY_COPY.books) {
    test(`${book.title} has navigable chapters and a path to its action`, async () => {
      signInAs(SIGNED_IN_USER);
      await render(
        await BookPage({ params: Promise.resolve({ book: book.id }) }),
      );
      await expect
        .element(page.getByRole("heading", { name: book.title, level: 1 }))
        .toBeVisible();
      const chapters = page.getByRole("navigation", {
        name: "Chapters",
        exact: true,
      });
      await Promise.all(
        book.chapters.map(async (chapter) => {
          await expect
            .element(chapters.getByRole("link", { name: chapter.title }))
            .toHaveAttribute("href", `#${chapter.id}`);
          await expect
            .element(
              page.getByRole("heading", { name: chapter.title, level: 2 }),
            )
            .toHaveAttribute("id", chapter.id);
        }),
      );
      await expect
        .element(
          page.getByRole("link", { name: book.action.label, exact: true }),
        )
        .toHaveAttribute("href", book.action.href);
      const related = page.getByRole("navigation", { name: "Related books" });
      await Promise.all(
        LIBRARY_COPY.books
          .filter((candidate) => candidate.id !== book.id)
          .map((candidate) =>
            expect
              .element(
                related.getByRole("link", {
                  name: candidate.title,
                  exact: true,
                }),
              )
              .toHaveAttribute("href", `/library/${candidate.id}`),
          ),
      );
    });
  }
  test("requires sign in before serving reading routes", async () => {
    signOut();
    await expect(LibraryPage()).rejects.toThrow(SIGNED_OUT_REDIRECT);
    await expect(
      BookPage({ params: Promise.resolve({ book: "constructs" }) }),
    ).rejects.toThrow(SIGNED_OUT_REDIRECT);
  });
});
