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

// A list's settings: its name and type.
function ListSettings({
  questId,
  list,
}: {
  readonly questId: QuestId;
  readonly list: List;
}): JSX.Element {
  const [state, action, pending] = useActionState(saveListAction, {});
  const { name: nameDraft, type: typeDraft } = state.draft ?? {};
  return (
    <form
      action={action}
      className="list-settings-form"
      aria-label={LISTS_COPY.settings}
    >
      <input name="questId" type="hidden" value={questId} />
      <input name="listId" type="hidden" value={list.id} />
      <TextField
        label={LISTS_COPY.fields.name}
        name="name"
        defaultValue={nameDraft ?? list.name}
        required={true}
      />
      <SelectField
        label={LISTS_COPY.fields.type}
        name="type"
        defaultValue={typeDraft ?? list.type}
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
  );
}

export { ListSettings };
