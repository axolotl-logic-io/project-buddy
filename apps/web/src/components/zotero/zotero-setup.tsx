"use client";

import {
  type JSX,
  type ReactNode,
  useActionState,
  useCallback,
  useState,
  useTransition,
} from "react";
import { NewListFoot } from "@/components/new-list-foot.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import { romanNumeral } from "@/ui/roman-numeral.ts";
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
const STEPS: typeof ZOTERO_COPY.setup.steps = ZOTERO_COPY.setup.steps;

// Where a setup step stands: finished, the one to do now, or one to come.
type StepState = "done" | "now" | "later";

// One numbered step of setup, with a rubric numeral, or a check once it
// is done, on a rail down to the next.
function SetupStep({
  number,
  state,
  title,
  children,
}: {
  readonly number: number;
  readonly state: StepState;
  readonly title: ReactNode;
  readonly children?: ReactNode;
}): JSX.Element {
  let mark = romanNumeral(number);
  if (state === "done") {
    mark = "✓";
  }
  return (
    <li className="zotero-step" data-state={state}>
      <span className="zotero-step-mark" aria-hidden="true">
        {mark}
      </span>
      <div className="zotero-step-body">
        <h3 className="zotero-step-title">{title}</h3>
        {children}
      </div>
    </li>
  );
}

// The library's collections as radio buttons, each with how many works it
// holds and each subcollection under its parent.
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
          <label className="zotero-collection">
            <input
              type="radio"
              name="collectionKey"
              value={node.key}
              defaultChecked={node.key === chosen}
              required={true}
            />
            <span className="zotero-collection-name">{node.name}</span>
            {node.count !== undefined && (
              <span className="zotero-collection-count">
                <span aria-hidden="true">{node.count}</span>
                <span className="sr-only">{STEPS.count(node.count)}</span>
              </span>
            )}
          </label>
          {node.children.length > 0 && (
            <CollectionTree nodes={node.children} chosen={chosen} />
          )}
        </li>
      ))}
    </ul>
  );
}

// The first step, done: the connected account, and change, which
// disconnects it so the owner can connect another.
function ConnectedTitle({
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
    <>
      {STEPS.connected}{" "}
      <small className="zotero-step-aside">
        <span className="sr-only">{COPY.connected(username)}</span>
        <span aria-hidden="true">{STEPS.connectedAs(username)}</span>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              className="zotero-step-change"
              disabled={busy}
              aria-label={COPY.disconnect}
            >
              {STEPS.change}
            </button>
          }
          title={COPY.disconnectConfirm.title}
          description={COPY.disconnectConfirm.description}
          confirmLabel={COPY.disconnectConfirm.confirm}
          cancelLabel={COPY.disconnectConfirm.cancel}
          onConfirm={disconnect}
          variant="danger"
        />
      </small>
    </>
  );
}

// The Checkmarks step's title: its name, and that it is optional.
function CheckmarksTitle(): JSX.Element {
  return (
    <>
      {STEPS.checkmarks}{" "}
      <small className="zotero-step-aside">{STEPS.optional}</small>
    </>
  );
}

// Once Zotero is connected: the three steps, the collection to import and
// whether it is checkable, with Back and Create and sync at the foot.
function CreateForm({
  questId,
  username,
  collections,
  writeAccess,
  shared,
}: {
  readonly questId: QuestId;
  readonly username: string;
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
        <ol className="zotero-steps">
          <SetupStep
            number={1}
            state="done"
            title={<ConnectedTitle username={username} />}
          />
          <SetupStep number={2} state="now" title={STEPS.collection}>
            <fieldset className="zotero-collection-choice">
              <legend className="sr-only">{COPY.collection}</legend>
              <p className="zotero-hint">{COPY.collectionHint}</p>
              <div className="zotero-collection-box">
                <CollectionTree nodes={collections} chosen={collectionDraft} />
              </div>
            </fieldset>
          </SetupStep>
          <SetupStep number={3} state="later" title={<CheckmarksTitle />}>
            <CheckableFields
              checkable={checkable}
              tag={tagDraft}
              onCheckable={setCheckable}
              offHint={STEPS.checkmarksOff}
            />
            {blocked === true && <Notice>{COPY.needsWrite}</Notice>}
          </SetupStep>
        </ol>
        {shared === true && <Notice>{COPY.shared}</Notice>}
        <FormStatus>{state.error}</FormStatus>
        <NewListFoot>
          <Button
            type="submit"
            disabled={pending || blocked}
            aria-busy={pending}
          >
            {createLabel}
          </Button>
        </NewListFoot>
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

// Before Zotero is connected, or without collections to choose: the
// steps, with what stops the owner going on, and Back at the foot.
function WaitingSteps({
  questId,
  setup,
}: {
  readonly questId: QuestId;
  readonly setup: ZoteroSetup;
}): JSX.Element {
  let connect: JSX.Element;
  let collection: ReactNode;
  if (setup.kind === "connected") {
    connect = (
      <SetupStep
        number={1}
        state="done"
        title={<ConnectedTitle username={setup.connection.username} />}
      />
    );
    collection = <Notice>{COPY.collectionsUnavailable}</Notice>;
    if (setup.collections?.length === 0) {
      collection = <Notice>{COPY.noCollections}</Notice>;
    }
  } else {
    connect = (
      <SetupStep number={1} state="now" title={STEPS.connect}>
        {setup.kind === "not-configured" && (
          <Notice>{ZOTERO_COPY.problems["not-configured"]}</Notice>
        )}
        {setup.kind === "not-connected" && (
          <>
            <p className="zotero-hint">{COPY.connectHint}</p>
            <ReconnectForm
              questId={questId}
              section="zotero"
              write={true}
              label={COPY.connect}
            />
          </>
        )}
      </SetupStep>
    );
  }
  let collectionState: StepState = "later";
  if (setup.kind === "connected") {
    collectionState = "now";
  }
  return (
    <>
      <ol className="zotero-steps">
        {connect}
        <SetupStep number={2} state={collectionState} title={STEPS.collection}>
          {collection}
        </SetupStep>
        <SetupStep number={3} state="later" title={<CheckmarksTitle />} />
      </ol>
      <NewListFoot />
    </>
  );
}

// Zotero setup in the New list dialog, for the quest's owner, as three
// numbered steps: connect Zotero, choose a collection, and choose whether
// its references get checkmarks.
function ZoteroSetupPanel({
  questId,
  setup,
  outcome,
  shared,
}: {
  readonly questId: QuestId;
  readonly setup: ZoteroSetup;
  // What Zotero answered when it sent the user back, if it just did.
  readonly outcome: "connected" | "failed" | undefined;
  // Whether others can see the quest.
  readonly shared: boolean;
}): JSX.Element {
  let steps = <WaitingSteps questId={questId} setup={setup} />;
  if (
    setup.kind === "connected" &&
    setup.collections !== undefined &&
    setup.collections.length > 0
  ) {
    steps = (
      <CreateForm
        questId={questId}
        username={setup.connection.username}
        collections={setup.collections}
        writeAccess={setup.connection.writeAccess}
        shared={shared}
      />
    );
  }
  return (
    <div className="zotero-setup">
      {outcome === "connected" && setup.kind === "connected" && (
        // The Connected step shows it; a screen reader hears it once.
        <p role="status" className="sr-only">
          {COPY.connectedNow}
        </p>
      )}
      {outcome === "failed" && <Alert>{COPY.connectFailed}</Alert>}
      {steps}
    </div>
  );
}

export { ZoteroSetupPanel };
