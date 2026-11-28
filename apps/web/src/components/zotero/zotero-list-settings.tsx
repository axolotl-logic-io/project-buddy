"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import {
  discardZoteroChangesAction,
  removeZoteroListAction,
  saveZoteroListSettingsAction,
} from "@/zotero/zotero-actions.ts";
import type { ZoteroList } from "@/zotero/zotero-list-store.ts";

const COPY: typeof ZOTERO_COPY.settings = ZOTERO_COPY.settings;

// The checkbox that makes a list checkable, and the tag field it shows.
function CheckableFields({
  checkable,
  tag,
  onCheckable,
}: {
  readonly checkable: boolean;
  readonly tag: string | undefined;
  readonly onCheckable: (checkable: boolean) => void;
}): JSX.Element {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onCheckable(event.target.checked),
    [onCheckable],
  );
  return (
    <fieldset className="zotero-checkable">
      <label className="zotero-choice">
        <input
          type="checkbox"
          name="checkable"
          checked={checkable}
          onChange={change}
        />
        <span>{ZOTERO_COPY.setup.checkable}</span>
      </label>
      <p className="zotero-hint">{ZOTERO_COPY.setup.checkableHint}</p>
      {checkable === true && (
        <TextField
          label={ZOTERO_COPY.setup.tag}
          hint={ZOTERO_COPY.setup.tagHint}
          name="tag"
          defaultValue={tag}
          required={true}
          maxLength={100}
        />
      )}
    </fieldset>
  );
}

// A Zotero Collection list's settings, for its owner: its name, whether it
// is checkable and through which tag, then discarding the waiting changes
// and removing the list.
function ZoteroListSettings({
  questId,
  zotero,
}: {
  readonly questId: QuestId;
  readonly zotero: ZoteroList;
}): JSX.Element {
  const [state, action, saving] = useActionState(
    saveZoteroListSettingsAction,
    {},
  );
  const {
    name: nameDraft,
    tag: tagDraft,
    checkable: checkableDraft,
  } = state.draft ?? {};
  const [checkable, setCheckable] = useState<boolean>(
    checkableDraft === "on" || zotero.checkmarkTag !== undefined,
  );
  const [busy, startBusy] = useTransition();
  const [said, setSaid] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | undefined>();
  const { list } = zotero;
  const discard = useCallback((): void => {
    setSaid(undefined);
    setProblem(undefined);
    startBusy(async () => {
      const result = await discardZoteroChangesAction(questId, list.id);
      if (result.ok) {
        setSaid(result.message);
      } else {
        setProblem(result.message);
      }
    });
  }, [list.id, questId]);
  const remove = useCallback((): void => {
    setProblem(undefined);
    startBusy(async () => {
      const result = await removeZoteroListAction(questId, list.id);
      if (!result.ok) {
        setProblem(result.message);
      }
    });
  }, [list.id, questId]);
  return (
    <div className="zotero-settings">
      <form action={action} className="zotero-form" aria-label={COPY.title}>
        <input name="questId" type="hidden" value={questId} />
        <input name="listId" type="hidden" value={list.id} />
        <TextField
          label={COPY.name}
          hint={COPY.nameHint}
          name="name"
          defaultValue={nameDraft ?? list.name}
          required={true}
          maxLength={80}
        />
        <p className="zotero-hint">{COPY.collection(zotero.collectionName)}</p>
        <CheckableFields
          checkable={checkable}
          tag={tagDraft ?? zotero.checkmarkTag}
          onCheckable={setCheckable}
        />
        <div className="zotero-actions">
          <Button type="submit" disabled={saving}>
            {COPY.save}
          </Button>
        </div>
        <FormStatus>
          {state.error}
          {state.saved}
        </FormStatus>
      </form>
      <div className="zotero-actions">
        {zotero.pending > 0 && (
          <ConfirmDialog
            trigger={
              <Button variant="quiet" disabled={busy}>
                {COPY.discard}
              </Button>
            }
            title={COPY.discardConfirm.title}
            description={COPY.discardConfirm.description}
            confirmLabel={COPY.discardConfirm.confirm}
            cancelLabel={COPY.discardConfirm.cancel}
            onConfirm={discard}
          />
        )}
        <ConfirmDialog
          trigger={
            <Button variant="quiet" disabled={busy}>
              {COPY.remove}
            </Button>
          }
          title={COPY.removeConfirm.title}
          description={COPY.removeConfirm.description}
          confirmLabel={COPY.removeConfirm.confirm}
          cancelLabel={COPY.removeConfirm.cancel}
          onConfirm={remove}
          variant="danger"
        />
      </div>
      <FormStatus>{said}</FormStatus>
      {problem !== undefined && <Alert>{problem}</Alert>}
    </div>
  );
}

export { CheckableFields, ZoteroListSettings };
