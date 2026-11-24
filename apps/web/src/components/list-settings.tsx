"use client";

import type { JSX } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import { LIST_TYPE } from "@/lists/list.ts";
import { saveListAction } from "@/lists/list-actions.ts";
import type { List } from "@/lists/list-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";

const { type: typeLabel, ...wordLabels }: typeof LISTS_COPY.fields =
  LISTS_COPY.fields;

function ListSettings({
  questId,
  list,
}: {
  readonly questId: QuestId;
  readonly list?: List;
}): JSX.Element {
  const [state, action, pending] = useActionState(saveListAction, {});
  const { type: typeDraft } = state.draft ?? {};
  const values: Partial<Record<string, string | number>> = {
    ...list,
    ...state.draft,
  };
  let title = LISTS_COPY.add;
  if (list !== undefined) {
    title = LISTS_COPY.settings;
  }
  return (
    <details>
      <summary>{title}</summary>
      <form action={action} className="grid gap-3">
        <input name="questId" type="hidden" value={questId} />
        {list !== undefined && (
          <input name="listId" type="hidden" value={list.id} />
        )}
        {Object.entries(wordLabels).map(([key, label]) => {
          const { [key]: value } = values;
          return (
            <TextField
              key={key}
              label={label}
              name={key}
              defaultValue={value ?? ""}
              required={true}
            />
          );
        })}
        <SelectField
          label={typeLabel}
          name="type"
          defaultValue={typeDraft ?? list?.type ?? "plain"}
        >
          {LIST_TYPE.options.map((type) => (
            <option key={type} value={type}>
              {LISTS_COPY.types[type]}
            </option>
          ))}
        </SelectField>
        <Button type="submit" disabled={pending}>
          {LISTS_COPY.save}
        </Button>
        <FormStatus>
          {state.error}
          {state.saved === true && LISTS_COPY.saved}
        </FormStatus>
      </form>
    </details>
  );
}

export { ListSettings };
