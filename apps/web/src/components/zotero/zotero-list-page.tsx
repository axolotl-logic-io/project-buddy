"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useId,
  useState,
  useTransition,
} from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import {
  connectZoteroAction,
  syncZoteroListAction,
} from "@/zotero/zotero-actions.ts";
import type { ZoteroList } from "@/zotero/zotero-list-store.ts";
import { ZoteroListSettings } from "./zotero-list-settings.tsx";
import { ZoteroReferences } from "./zotero-references.tsx";

const COPY: typeof ZOTERO_COPY.list = ZOTERO_COPY.list;

// The owner's button that sends them to Zotero to connect again, then back
// to this list, asking for permission to change the library when write is
// true.
function ReconnectForm({
  questId,
  section,
  write,
  label,
}: {
  readonly questId: QuestId;
  readonly section: string;
  readonly write: boolean;
  readonly label: string;
}): JSX.Element {
  const [state, action, pending] = useActionState(connectZoteroAction, {});
  return (
    <form action={action} className="zotero-reconnect">
      <input name="questId" type="hidden" value={questId} />
      <input name="section" type="hidden" value={section} />
      {write === true && <input name="write" type="hidden" value="on" />}
      <Button type="submit" disabled={pending}>
        {label}
      </Button>
      <FormStatus>{state.error}</FormStatus>
    </form>
  );
}

// The last sync's time and what it did: what it sent, what waits, and
// each work it skipped because the work left the collection.
function SyncSummary({ zotero }: { readonly zotero: ZoteroList }): JSX.Element {
  const { lastSync } = zotero;
  let summary = COPY.synced(lastSync);
  if (lastSync.kind === "failed") {
    summary = `${COPY.failed(lastSync)} ${ZOTERO_COPY.problems[lastSync.problem]}`;
  }
  return (
    <div className="zotero-sync-summary">
      <p className="zotero-hint">
        {COPY.lastSynced}{" "}
        <LocalTime dateTime={zotero.syncedAt} detail="minute" />
      </p>
      <Notice role="status">{summary}</Notice>
      {lastSync.skipped.length > 0 && (
        <div className="zotero-skipped">
          <p>{COPY.skipped}</p>
          <ul>
            {lastSync.skipped.map(({ key, text }) => (
              <li key={key}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// The owner's Sync button with the count of waiting changes beside it.
function SyncButton({
  questId,
  zotero,
}: {
  readonly questId: QuestId;
  readonly zotero: ZoteroList;
}): JSX.Element {
  const [syncing, startSync] = useTransition();
  const [problem, setProblem] = useState<string | undefined>();
  const { list } = zotero;
  const sync = useCallback((): void => {
    setProblem(undefined);
    startSync(async () => {
      const result = await syncZoteroListAction(questId, list.id);
      if (!result.ok) {
        setProblem(result.message);
      }
    });
  }, [list.id, questId]);
  let label: string = COPY.sync;
  if (syncing) {
    label = COPY.syncing;
  }
  return (
    <div className="zotero-sync">
      <Button onClick={sync} disabled={syncing} aria-busy={syncing}>
        {label}
      </Button>
      {zotero.pending > 0 && (
        <span className="zotero-pending">{COPY.pending(zotero.pending)}</span>
      )}
      {problem !== undefined && <Alert>{problem}</Alert>}
    </div>
  );
}

// Why marks are closed or checkmarks are missing, and for the owner, the
// way to reconnect.
function ListNotices({
  questId,
  zotero,
  owner,
}: {
  readonly questId: QuestId;
  readonly zotero: ZoteroList;
  readonly owner: boolean;
}): JSX.Element {
  const { unavailable, lastSync, list } = zotero;
  const reconnect =
    owner &&
    (unavailable === "access-ended" ||
      unavailable === "other-account" ||
      (lastSync.kind === "failed" && lastSync.problem === "no-write-access"));
  return (
    <>
      {unavailable !== undefined && (
        <Notice>
          {ZOTERO_COPY.unavailable[unavailable]}{" "}
          {zotero.checkmarkTag !== undefined && COPY.marksClosed}
        </Notice>
      )}
      {zotero.checkmarkTag !== undefined && !zotero.checkmarksShown && (
        <Notice>{COPY.newTag}</Notice>
      )}
      {reconnect === true && (
        <ReconnectForm
          questId={questId}
          section={list.id}
          write={zotero.checkmarkTag !== undefined}
          label={ZOTERO_COPY.setup.connect}
        />
      )}
    </>
  );
}

// A Zotero Collection list on its own page: a link back to the quest, the
// list's name and size, and for the quest's owner its settings and Sync;
// then the last sync, a search field and the references in Works Cited
// order.
function ZoteroListPage({
  questId,
  quest,
  back,
  zotero,
  owner,
}: {
  readonly questId: QuestId;
  // The quest's name, for the link back to it.
  readonly quest: string;
  readonly back: Route;
  readonly zotero: ZoteroList;
  // Whether the viewer owns the quest.
  readonly owner: boolean;
}): JSX.Element {
  const settingsId = useId();
  const searchId = useId();
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const toggleSettings = useCallback(
    (): void => setSettingsOpen((shown) => !shown),
    [],
  );
  const changeSearch = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setSearch(event.target.value),
    [],
  );
  const { list } = zotero;
  let checkmarks: "markable" | "shown" | "hidden" = "hidden";
  if (zotero.markable) {
    checkmarks = "markable";
  } else if (zotero.checkmarksShown) {
    checkmarks = "shown";
  }
  return (
    <div className="page-workspace quest-folio zotero-list-page list-page">
      <header className="list-page-top">
        <Link
          className="list-page-back"
          href={back}
          aria-label={ZOTERO_COPY.setup.back(quest)}
        >
          <Icon name="chevron-left" />
          <span className="list-page-back-name">{quest}</span>
        </Link>
        <div className="list-page-head">
          <div className="list-page-name">
            <h2 className="quest-focus-title">{list.name}</h2>
            <span className="list-section-size">
              <span aria-hidden={true} className="list-section-dot" />{" "}
              {COPY.count(zotero.references.length)}
            </span>
          </div>
          {owner === true && (
            <Button
              variant="quiet"
              className="list-page-settings-open"
              aria-label={LISTS_COPY.settings}
              title={LISTS_COPY.settings}
              aria-expanded={settingsOpen}
              aria-controls={settingsId}
              onClick={toggleSettings}
            >
              <Icon name="settings" />
            </Button>
          )}
        </div>
        {owner === true && (
          <div
            id={settingsId}
            className="list-page-settings"
            hidden={!settingsOpen}
          >
            <ZoteroListSettings questId={questId} zotero={zotero} />
          </div>
        )}
      </header>
      {owner === true && <SyncButton questId={questId} zotero={zotero} />}
      <SyncSummary zotero={zotero} />
      <ListNotices questId={questId} zotero={zotero} owner={owner} />
      <div className="zotero-search">
        <label htmlFor={searchId} className="sr-only">
          {COPY.search}
        </label>
        <input
          id={searchId}
          className="input-field"
          type="search"
          placeholder={COPY.search}
          value={search}
          onChange={changeSearch}
        />
      </div>
      {zotero.references.length === 0 && (
        <p className="list-page-empty">{COPY.empty}</p>
      )}
      <ZoteroReferences
        questId={questId}
        listId={list.id}
        label={list.name}
        references={zotero.references}
        checkmarks={checkmarks}
        search={search}
      />
    </div>
  );
}

export { ReconnectForm, ZoteroListPage };
