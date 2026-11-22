"use client";

import { type JSX, type SubmitEvent, useCallback, useState } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import { MURMLING_CHANGE } from "@/spaces/murmling.ts";
import { changeMurmlingAction } from "@/spaces/murmling-actions.ts";
import type { Murmling } from "@/spaces/murmling-store.ts";
import { MURMLING_TYPE } from "@/spaces/space.ts";
import type { Space } from "@/spaces/space-store.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";

interface SpaceMurmlingsProps {
  readonly questId: QuestId;
  readonly space: Space;
  readonly contents: readonly Murmling[];
  readonly destinations: readonly Space[];
}

type Submit = (event: SubmitEvent<HTMLFormElement>) => Promise<void>;

function MurmlingRow({
  item,
  space,
  destinations,
  submit,
  pending,
}: Omit<SpaceMurmlingsProps, "contents" | "questId"> & {
  readonly item: Murmling;
  readonly submit: Submit;
  readonly pending: boolean;
}): JSX.Element {
  const label = SPACES_COPY.editMurmling(space.singular);
  let checkedLabel = space.checkOff;
  if (item.checkedOff) {
    checkedLabel = space.uncheck;
  }
  return (
    <li className="grid gap-2">
      {item.type === "task" && (
        <form onSubmit={submit}>
          <input type="hidden" name="id" value={item.id} />
          <input
            type="hidden"
            name="checkedOff"
            value={String(!item.checkedOff)}
          />
          <Button
            type="submit"
            name="kind"
            value="check"
            variant="quiet"
            disabled={pending}
          >
            {checkedLabel}
          </Button>
        </form>
      )}
      <details>
        <summary>{item.text}</summary>
        <form onSubmit={submit}>
          <input type="hidden" name="id" value={item.id} />
          <label>
            {label}
            <textarea
              className="input-field"
              name="text"
              defaultValue={item.text}
              key={item.text}
            />
          </label>
          <Button type="submit" name="kind" value="edit" disabled={pending}>
            {SPACES_COPY.saveEdit}
          </Button>
        </form>
      </details>
      {item.type === "quick-note" && (
        <LocalTime dateTime={item.createdAt} detail="day" />
      )}
      <details>
        <summary>{SPACES_COPY.actions(space.singular)}</summary>
        {item.taskNumber !== null && (
          <p>{SPACES_COPY.taskNumber(item.taskNumber)}</p>
        )}
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={item.id} />
          <Button
            type="submit"
            name="direction"
            value="up"
            variant="quiet"
            disabled={pending}
          >
            {SPACES_COPY.moveUp}
          </Button>
          <Button
            type="submit"
            name="direction"
            value="down"
            variant="quiet"
            disabled={pending}
          >
            {SPACES_COPY.moveDown}
          </Button>
          {MURMLING_TYPE.options
            .filter((type) => type !== item.type)
            .map((type) => (
              <Button
                type="submit"
                name="type"
                key={type}
                value={type}
                variant="quiet"
                disabled={pending}
              >
                {SPACES_COPY.markAs(SPACES_COPY.types[type])}
              </Button>
            ))}
          <Button
            type="submit"
            name="kind"
            value="remove"
            variant="quiet-danger"
            disabled={pending}
          >
            {SPACES_COPY.removeMurmling(space.singular)}
          </Button>
        </form>
        {destinations.length > 0 && (
          <form onSubmit={submit}>
            <input type="hidden" name="id" value={item.id} />
            <label>
              {SPACES_COPY.moveTo}
              <select className="input-field" name="destination">
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="submit"
              name="kind"
              value="move"
              variant="quiet"
              disabled={pending}
            >
              {SPACES_COPY.move}
            </Button>
          </form>
        )}
      </details>
    </li>
  );
}

function readChange(
  event: SubmitEvent<HTMLFormElement>,
): ReturnType<typeof MURMLING_CHANGE.safeParse> {
  const values = new FormData(event.currentTarget, event.nativeEvent.submitter);
  const { kind, type, direction, checkedOff, ...fields } =
    Object.fromEntries(values);
  let operation = kind;
  if (direction !== undefined) {
    operation = "reorder";
  }
  if (type !== undefined) {
    operation = "type";
  }
  return MURMLING_CHANGE.safeParse({
    ...fields,
    kind: operation,
    type,
    direction,
    checkedOff: checkedOff === "true",
  });
}

function SpaceMurmlings({
  questId,
  space,
  contents,
  destinations,
}: SpaceMurmlingsProps): JSX.Element {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const spaceId = space.id;

  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = event.currentTarget;
      const parsed = readChange(event);
      if (!parsed.success) {
        setError(SPACES_COPY.invalidChange);
        return;
      }
      setPending(true);
      setError("");
      setSaved(false);
      try {
        const problem = await changeMurmlingAction({
          questId,
          spaceId,
          change: parsed.data,
        });
        setError(problem ?? "");
        setSaved(problem === undefined);
        if (problem === undefined && parsed.data.kind === "add") {
          form.reset();
        }
      } catch {
        setError(SPACES_COPY.changeProblems.missing);
      } finally {
        setPending(false);
      }
    },
    [questId, spaceId],
  );

  function row(item: Murmling): JSX.Element {
    return (
      <MurmlingRow
        key={item.id}
        item={item}
        space={space}
        destinations={destinations}
        submit={submit}
        pending={pending}
      />
    );
  }

  const done = contents.filter((item) => item.checkedOff);
  return (
    <div className="grid gap-3">
      <form onSubmit={submit}>
        <label>
          {SPACES_COPY.addMurmling(space.singular)}
          <textarea className="input-field" name="text" required={true} />
        </label>
        <Button type="submit" name="kind" value="add" disabled={pending}>
          {SPACES_COPY.addMurmling(space.singular)}
        </Button>
      </form>
      {error !== "" && <Alert>{error}</Alert>}
      <FormStatus>{saved === true && SPACES_COPY.added}</FormStatus>
      <ul className="grid gap-3">
        {contents.filter((item) => !item.checkedOff).map(row)}
      </ul>
      {done.length > 0 && (
        <details>
          <summary>{SPACES_COPY.done}</summary>
          <ul className="grid gap-3">{done.map(row)}</ul>
        </details>
      )}
    </div>
  );
}

export { SpaceMurmlings };
