import Link from "next/link";
import type { JSX } from "react";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { Button } from "@/components/ui/button.tsx";
import { LIBRARY_COPY, type LibraryBook } from "@/ui/copy/library.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

function LibraryIndex(): JSX.Element {
  const [book] = LIBRARY_COPY.books;
  if (book === undefined) {
    return (
      <PageWorkspace title={LIBRARY_COPY.heading} intro={LIBRARY_COPY.intro}>
        <div />
      </PageWorkspace>
    );
  }
  return <LibraryReader book={book} index={true} />;
}

function LibraryReader({
  book,
  index = false,
}: {
  readonly book: LibraryBook;
  readonly index?: boolean;
}): JSX.Element {
  let { title } = book;
  if (index === true) {
    title = LIBRARY_COPY.heading;
  }
  return (
    <PageWorkspace title={title} intro={book.intro}>
      <nav className="workspace-rail" aria-label={WORKSPACES_COPY.books}>
        <div className="workspace-tablist">
          {LIBRARY_COPY.books.map((candidate) => {
            let current: "page" | undefined;
            if (candidate.id === book.id) {
              current = "page";
            }
            return (
              <Link
                className="workspace-tab"
                aria-current={current}
                key={candidate.id}
                href={`/library/${candidate.id}`}
              >
                {candidate.title}
              </Link>
            );
          })}
        </div>
      </nav>
      <article className="workspace-reader break-words">
        <nav className="workspace-chapters" aria-label={LIBRARY_COPY.contents}>
          <h2 className="section-heading">{LIBRARY_COPY.contents}</h2>
          <ol className="flex flex-col">
            {book.chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link className="library-link" href={`#${chapter.id}`}>
                  {chapter.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="workspace-reading">
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
              {chapter.links.length > 0 && (
                <ul className="flex flex-col">
                  {chapter.links.map((link) => (
                    <li key={link.href}>
                      <Link className="library-link" href={link.href}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <Button asChild={true} className="self-start" variant="secondary">
            <Link href={book.action.href}>{book.action.label}</Link>
          </Button>
          {index !== true && (
            <nav aria-label={LIBRARY_COPY.related}>
              <h2 className="section-heading">{LIBRARY_COPY.related}</h2>
              <ul className="flex flex-col">
                {LIBRARY_COPY.books
                  .filter((related) => related.id !== book.id)
                  .map((related) => (
                    <li key={related.id}>
                      <Link
                        className="library-link"
                        href={`/library/${related.id}`}
                      >
                        {related.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          )}
        </div>
      </article>
    </PageWorkspace>
  );
}

export { LibraryIndex, LibraryReader };
