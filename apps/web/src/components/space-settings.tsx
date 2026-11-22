"use client";

import type { JSX } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import { MURMLING_TYPE } from "@/spaces/space.ts";
import { saveSpaceAction } from "@/spaces/space-actions.ts";
import type { Space } from "@/spaces/space-store.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";

const { newType, ...wordLabels }: typeof SPACES_COPY.fields =
  SPACES_COPY.fields;

function SpaceSettings({
  questId,
  space,
}: {
  readonly questId: QuestId;
  readonly space?: Space;
}): JSX.Element {
  const [state, action, pending] = useActionState(saveSpaceAction, {});
  const { newType: typeDraft } = state.draft ?? {};
  const values: Partial<Record<string, string | number>> = {
    ...space,
    ...state.draft,
  };
  let title = SPACES_COPY.add;
  if (space !== undefined) {
    title = SPACES_COPY.settings;
  }
  return (
    <details>
      <summary>{title}</summary>
      <form action={action} className="grid gap-3">
        <input name="questId" type="hidden" value={questId} />
        {space !== undefined && (
          <input name="spaceId" type="hidden" value={space.id} />
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
          label={newType}
          name="newType"
          defaultValue={typeDraft ?? space?.newType ?? "plain"}
        >
          {MURMLING_TYPE.options.map((type) => (
            <option key={type} value={type}>
              {SPACES_COPY.types[type]}
            </option>
          ))}
        </SelectField>
        <Button type="submit" disabled={pending}>
          {SPACES_COPY.save}
        </Button>
        <FormStatus>
          {state.error}
          {state.saved === true && SPACES_COPY.saved}
        </FormStatus>
      </form>
    </details>
  );
}

export { SpaceSettings };
