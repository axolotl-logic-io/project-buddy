"use client";

import type { Route } from "next";
import Link from "next/link";
import { type JSX, useId } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import { entryHolds } from "@/zotero/works-cited.ts";
import type { ZoteroList } from "@/zotero/zotero-list-store.ts";
import { WorksCitedText } from "./zotero-references.tsx";

// How many references a section shows; the rest are a link away.
const SECTION_REFERENCES = 5;

const COPY: typeof ZOTERO_COPY.list = ZOTERO_COPY.list;

// A Zotero Collection list's section on the quest's overview: its name,
// linking to its page, and its first references, read only. While the
// add box holds a search, the section shows each reference that holds it.
function ZoteroListSection({
  zotero,
  href,
  search,
}: {
  readonly zotero: ZoteroList;
  readonly href: Route;
  readonly search: string;
}): JSX.Element {
  const headingId = useId();
  const { list, references } = zotero;
  let inView = references.slice(0, SECTION_REFERENCES);
  let rest = references.length - inView.length;
  if (search.trim() !== "") {
    inView = references.filter((reference) =>
      entryHolds(reference.entry, search),
    );
    rest = 0;
  }
  return (
    <section aria-labelledby={headingId} className="list-section">
      <div className="list-section-head">
        <h3 className="list-section-title" id={headingId}>
          <span aria-hidden={true} className="list-section-mark" />
          <Link className="list-section-name" href={href}>
            <span className="wrap-anywhere">{list.name}</span>
            <span className="list-section-size">
              <span aria-hidden={true} className="list-section-dot" />{" "}
              {COPY.count(references.length)}
            </span>
          </Link>
        </h3>
        <span aria-hidden={true} className="list-section-rule" />
      </div>
      {inView.length > 0 && (
        <ul aria-label={list.name} className="zotero-references">
          {inView.map((reference) => (
            <li key={reference.id} className="zotero-reference">
              <div className="zotero-reference-body">
                <WorksCitedText entry={reference.entry} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {inView.length === 0 && search.trim() !== "" && (
        <p className="list-page-empty">{COPY.noMatch(search.trim())}</p>
      )}
      {rest > 0 && (
        <Link className="list-section-more" href={href}>
          {COPY.more(rest, list.name)}
          <Icon name="chevron-right" />
        </Link>
      )}
    </section>
  );
}

export { ZoteroListSection };
