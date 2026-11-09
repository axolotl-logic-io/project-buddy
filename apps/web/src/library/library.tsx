import Link from "next/link";
import type { JSX } from "react";
import { LIBRARY_COPY, type LibraryBook } from "@/ui/copy/library.ts";

function LibraryIndex(): JSX.Element {
  return (
    <>
      <h1 className="page-heading">{LIBRARY_COPY.heading}</h1>
      <p>{LIBRARY_COPY.intro}</p>
      <ul className="flex min-w-0 flex-col gap-4">
        {LIBRARY_COPY.books.map((book) => (
          <li className="card min-w-0" key={book.id}>
            <h2 className="section-heading">
              <Link
                className="inline-flex min-h-(--target-size) items-center text-link"
                href={`/library/${book.id}`}
              >
                {book.title}
              </Link>
            </h2>
            <p>{book.intro}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

function LibraryReader({ book }: { readonly book: LibraryBook }): JSX.Element {
  return (
    <article className="flex min-w-0 flex-col gap-4 break-words">
      <Link
        className="inline-flex min-h-(--target-size) items-center text-link"
        href="/library"
      >
        {LIBRARY_COPY.heading}
      </Link>
      <h1 className="page-heading">{book.title}</h1>
      <p>{book.intro}</p>
      <nav aria-label={LIBRARY_COPY.contents}>
        <h2 className="section-heading">{LIBRARY_COPY.contents}</h2>
        <ol className="flex flex-col gap-2">
          {book.chapters.map((chapter) => (
            <li key={chapter.id}>
              <Link
                className="inline-flex min-h-(--target-size) items-center text-link"
                href={`#${chapter.id}`}
              >
                {chapter.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      {book.chapters.map((chapter) => (
        <section
          className="flex min-w-0 flex-col gap-3"
          aria-labelledby={chapter.id}
          key={chapter.id}
        >
          <h2 className="section-heading" id={chapter.id} tabIndex={-1}>
            {chapter.title}
          </h2>
          {chapter.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <Link
        className="inline-flex min-h-(--target-size) items-center text-link"
        href={book.action.href}
      >
        {book.action.label}
      </Link>
      <nav aria-label={LIBRARY_COPY.related}>
        <h2 className="section-heading">{LIBRARY_COPY.related}</h2>
        <ul className="flex flex-col gap-2">
          {LIBRARY_COPY.books
            .filter((related) => related.id !== book.id)
            .map((related) => (
              <li key={related.id}>
                <Link
                  className="inline-flex min-h-(--target-size) items-center text-link"
                  href={`/library/${related.id}`}
                >
                  {related.title}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </article>
  );
}

export { LibraryIndex, LibraryReader };
