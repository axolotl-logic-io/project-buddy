import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { LibraryReader } from "@/library/library.tsx";
import { LIBRARY_COPY } from "@/ui/copy/library.ts";
import { pageTitle } from "@/ui/copy/site.ts";

interface BookPageProps {
  readonly params: Promise<{ book: string }>;
}

async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { book: id } = await params;
  const book = LIBRARY_COPY.books.find((candidate) => candidate.id === id);
  return { title: pageTitle(book?.title ?? LIBRARY_COPY.heading) };
}

async function BookPage({ params }: BookPageProps): Promise<JSX.Element> {
  await requireUser();
  const { book: id } = await params;
  const book = LIBRARY_COPY.books.find((candidate) => candidate.id === id);
  if (book === undefined) {
    notFound();
  }
  return <LibraryReader book={book} />;
}

export { generateMetadata };
export default BookPage;
