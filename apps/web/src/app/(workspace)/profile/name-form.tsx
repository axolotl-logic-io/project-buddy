"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { USER_NAME_MAX_LENGTH } from "@/accounts/user-name.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { type SetNameState, setNameAction } from "./actions.ts";

const IDLE: SetNameState = { kind: "idle" };

// The form that changes the user's name. The user's text stays in the field
// whatever the action answers, so a refused name can be fixed; a saved name
// calls onSaved. Cancel, offered once there is a name to go back to, drops
// the draft. When it opens at the user's request, focus moves to the field.
function NameEditor({
  name,
  focus,
  onSaved,
  onCancel,
}: {
  readonly name: string | undefined;
  readonly focus: boolean;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState(name ?? "");
  const save = useCallback(
    async (previous: SetNameState, form: FormData): Promise<SetNameState> => {
      const result = await setNameAction(previous, form);
      if (result.kind === "saved") {
        onSaved();
      }
      return result;
    },
    [onSaved],
  );
  const [state, formAction, pending] = useActionState(save, IDLE);
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );
  const focusField = useCallback(
    (field: HTMLInputElement | null): void => {
      if (focus) {
        field?.focus();
      }
    },
    [focus],
  );
  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  return (
    <form action={formAction} className="profile-name-form">
      <TextField
        error={error}
        hint={ACCOUNT_COPY.nameHint}
        label={ACCOUNT_COPY.nameLabel}
        maxLength={USER_NAME_MAX_LENGTH}
        name="name"
        onChange={updateDraft}
        ref={focusField}
        required={true}
        type="text"
        value={draft}
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} type="submit">
          {ACCOUNT_COPY.saveName}
        </Button>
        {name !== undefined && (
          <Button onClick={onCancel} variant="secondary">
            {ACCOUNT_COPY.cancelRename}
          </Button>
        )}
      </div>
    </form>
  );
}

// The user's name as Profile's heading, with Rename opening the form that
// changes the name a construct's {{name}} stands for. A user with no saved
// name sees the form open. When the form closes, focus goes back to Rename,
// and a saved name says so.
export function NameForm({
  name,
}: {
  readonly name: string | undefined;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const renameRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  useEffect(() => {
    if (editing === false && restoreFocusRef.current === true) {
      renameRef.current?.focus();
      restoreFocusRef.current = false;
    }
  }, [editing]);
  const open = useCallback((): void => {
    setSaved(false);
    setEditing(true);
  }, []);
  const close = useCallback((): void => {
    restoreFocusRef.current = true;
    setEditing(false);
  }, []);
  const closeSaved = useCallback((): void => {
    setSaved(true);
    close();
  }, [close]);
  let status = "";
  if (saved === true) {
    status = ACCOUNT_COPY.nameSaved;
  }
  let shown: JSX.Element;
  if (editing === true || name === undefined) {
    shown = (
      <NameEditor
        focus={editing}
        name={name}
        onCancel={close}
        onSaved={closeSaved}
      />
    );
  } else {
    shown = (
      <div className="profile-name-row">
        <h2 className="profile-name-heading">{name}</h2>
        <Button onClick={open} ref={renameRef} variant="quiet">
          <Icon name="pencil" />
          {ACCOUNT_COPY.rename}
        </Button>
      </div>
    );
  }
  return (
    <div className="profile-name">
      {shown}
      <FormStatus>{status}</FormStatus>
    </div>
  );
}
