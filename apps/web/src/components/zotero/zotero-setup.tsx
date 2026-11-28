"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  type JSX,
  useActionState,
  useCallback,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import {
  createZoteroListAction,
  disconnectZoteroAction,
} from "@/zotero/zotero-actions.ts";
import type {
  CollectionNode,
  ZoteroSetup,
} from "@/zotero/zotero-connection.ts";
import { ReconnectForm } from "./zotero-list-page.tsx";
import { CheckableFields } from "./zotero-list-settings.tsx";

const COPY: typeof ZOTERO_COPY.setup = ZOTERO_COPY.setup;

// The library's collections as radio buttons, each subcollection under its
// parent.
function CollectionTree({
  nodes,
  chosen,
}: {
  readonly nodes: readonly CollectionNode[];
  readonly chosen: string | undefined;
}): JSX.Element {
  return (
    <ul className="zotero-collections">
      {nodes.map((node) => (
        <li key={node.key}>
          <label className="zotero-choice">
            <input
              type="radio"
              name="collectionKey"
              value={node.key}
              defaultChecked={node.key === chosen}
              required={true}
            />
            <span className="wrap-anywhere">{node.name}</span>
          </label>
          {node.children.length > 0 && (
            <CollectionTree nodes={node.children} chosen={chosen} />
          )}
        </li>
      ))}
    </ul>
  );
}

// The connected account, with the button that disconnects it.
function ConnectedAccount({
  username,
}: {
  readonly username: string;
}): JSX.Element {
  const [busy, startBusy] = useTransition();
  const disconnect = useCallback((): void => {
    startBusy(async () => {
      await disconnectZoteroAction();
    });
  }, []);
  return (
    <div className="zotero-account">
      <p>{COPY.connected(username)}</p>
      <ConfirmDialog
        trigger={
          <Button variant="quiet" disabled={busy}>
            {COPY.disconnect}
          </Button>
        }
        title={COPY.disconnectConfirm.title}
        description={COPY.disconnectConfirm.description}
        confirmLabel={COPY.disconnectConfirm.confirm}
        cancelLabel={COPY.disconnectConfirm.cancel}
        onConfirm={disconnect}
        variant="danger"
      />
    </div>
  );
}

// The form that picks a collection and imports it as a new list.
function CreateForm({
  questId,
  collections,
  writeAccess,
  shared,
}: {
  readonly questId: QuestId;
  readonly collections: readonly CollectionNode[];
  readonly writeAccess: boolean;
  readonly shared: boolean;
}): JSX.Element {
  const [state, action, pending] = useActionState(createZoteroListAction, {});
  const {
    collectionKey: collectionDraft,
    tag: tagDraft,
    checkable: checkableDraft,
  } = state.draft ?? {};
  const [checkable, setCheckable] = useState<boolean>(checkableDraft === "on");
  const blocked = checkable && !writeAccess;
  let createLabel: string = COPY.create;
  if (pending) {
    createLabel = COPY.creating;
  }
  return (
    <>
      <form action={action} className="zotero-form" aria-label={COPY.title}>
        <input name="questId" type="hidden" value={questId} />
        <fieldset className="zotero-collection-choice">
          <legend>{COPY.collection}</legend>
          <p className="zotero-hint">{COPY.collectionHint}</p>
          <CollectionTree nodes={collections} chosen={collectionDraft} />
        </fieldset>
        <CheckableFields
          checkable={checkable}
          tag={tagDraft}
          onCheckable={setCheckable}
        />
        {blocked === true && <Notice>{COPY.needsWrite}</Notice>}
        {shared === true && <Notice>{COPY.shared}</Notice>}
        <div className="zotero-actions">
          <Button
            type="submit"
            disabled={pending || blocked}
            aria-busy={pending}
          >
            {createLabel}
          </Button>
        </div>
        <FormStatus>{state.error}</FormStatus>
      </form>
      {blocked === true && (
        <ReconnectForm
          questId={questId}
          section="zotero"
          write={true}
          label={COPY.connectWithWrite}
        />
      )}
    </>
  );
}

// Zotero setup on the quest's page, for its owner: connecting Zotero, then
// choosing a collection to import as a new list.
function ZoteroSetupSection({
  questId,
  quest,
  back,
  setup,
  outcome,
  shared,
}: {
  readonly questId: QuestId;
  readonly quest: string;
  readonly back: Route;
  readonly setup: ZoteroSetup;
  // What Zotero answered when it sent the user back, if it just did.
  readonly outcome: "connected" | "failed" | undefined;
  // Whether others can see the quest.
  readonly shared: boolean;
}): JSX.Element {
  return (
    <section className="page-workspace quest-folio zotero-setup list-page">
      <header className="list-page-top">
        <Link
          className="list-page-back"
          href={back}
          aria-label={COPY.back(quest)}
        >
          <Icon name="chevron-left" />
          <span className="list-page-back-name">{quest}</span>
        </Link>
        <h2 className="quest-focus-title">{COPY.title}</h2>
      </header>
      <p>{COPY.intro}</p>
      {outcome === "connected" && setup.kind === "connected" && (
        <Notice role="status">{COPY.connectedNow}</Notice>
      )}
      {outcome === "failed" && <Alert>{COPY.connectFailed}</Alert>}
      {setup.kind === "not-configured" && (
        <Notice>{ZOTERO_COPY.problems["not-configured"]}</Notice>
      )}
      {setup.kind === "not-connected" && (
        <>
          <p className="zotero-hint">{COPY.connectHint}</p>
          <ReconnectForm
            questId={questId}
            section="zotero"
            write={false}
            label={COPY.connect}
          />
        </>
      )}
      {setup.kind === "connected" && (
        <>
          <ConnectedAccount username={setup.connection.username} />
          {setup.collections === undefined && (
            <Notice>{COPY.collectionsUnavailable}</Notice>
          )}
          {setup.collections?.length === 0 && (
            <Notice>{COPY.noCollections}</Notice>
          )}
          {setup.collections !== undefined && setup.collections.length > 0 && (
            <CreateForm
              questId={questId}
              collections={setup.collections}
              writeAccess={setup.connection.writeAccess}
              shared={shared}
            />
          )}
        </>
      )}
    </section>
  );
}

export { ZoteroSetupSection };
