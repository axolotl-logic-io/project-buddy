"use client";

import {
  type JSX,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/ui/icon.tsx";
import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import {
  type ConstructId,
  DEFAULT_CONSTRUCT_ID,
  listConstructs,
} from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

// A construct as the picker shows it.
interface ConstructChoice {
  readonly id: ConstructId | OwnPromptId;
  readonly name: string;
  readonly description: string;
  readonly own: boolean;
}

const BUILT_IN_CHOICES: readonly ConstructChoice[] = listConstructs().map(
  ({ id, name, description }) => ({ id, name, description, own: false }),
);

const NO_USER_CONSTRUCTS: readonly OwnConstructChoice[] = [];

// The words of a name, for its monogram.
const NAME_WORD = /\p{L}+/gu;

// The list's buttons, for moving between them by arrow key.
const OPTION_SELECTOR = "button[data-choice]";

// The first letters of a name's first two words, such as "PN" for Professor Notebook.
function monogram(name: string): string {
  return Array.from(name.matchAll(NAME_WORD), ([word]) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// A construct's initials in a circle, in the accent colour for one of the
// user's own.
function ConstructMonogram({
  choice,
  small = false,
}: {
  readonly choice: ConstructChoice;
  readonly small?: boolean;
}): JSX.Element {
  let className = "construct-monogram";
  if (choice.own === true) {
    className += " construct-monogram-own";
  }
  if (small === true) {
    className += " construct-monogram-small";
  }
  return (
    <span aria-hidden={true} className={className}>
      {monogram(choice.name)}
    </span>
  );
}

// One construct in the picker's list, as a button that chooses it, named by the
// construct's name and described by the first line of a built-in construct's
// description.
function ConstructOption({
  choice,
  choiceIndex,
  current,
  onChoose,
  onKey,
}: {
  readonly choice: ConstructChoice;
  readonly choiceIndex: number;
  readonly current: boolean;
  readonly onChoose: (choiceIndex: number) => void;
  readonly onKey: (
    event: KeyboardEvent<HTMLButtonElement>,
    choiceIndex: number,
  ) => void;
}): JSX.Element {
  const choose = useCallback((): void => {
    onChoose(choiceIndex);
  }, [onChoose, choiceIndex]);
  const key = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      onKey(event, choiceIndex);
    },
    [onKey, choiceIndex],
  );
  const descriptionId = useId();
  let description: JSX.Element | undefined;
  let describedBy: string | undefined;
  if (choice.own === false) {
    describedBy = descriptionId;
    description = (
      <span className="construct-option-description" id={descriptionId}>
        {choice.description}
      </span>
    );
  }
  return (
    <li>
      <button
        aria-current={current}
        aria-describedby={describedBy}
        aria-label={choice.name}
        className="construct-option"
        data-choice={true}
        onClick={choose}
        onKeyDown={key}
        type="button"
      >
        <ConstructMonogram choice={choice} small={true} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{choice.name}</span>
          {description}
        </span>
      </button>
    </li>
  );
}

// A form's choice of construct, sent as `constructId`: the built-in constructs,
// then any of the user's own given, with defaultConstructId, or else the
// default construct, chosen to start with. It shows the chosen construct's card,
// between buttons to the previous and next construct, which wrap round at
// either end. "Choose a construct" puts the list of every construct in the card's
// place, at the card's height, so nothing around the picker moves; choosing
// one, or Escape, puts the card back.
function ConstructPicker({
  defaultConstructId = DEFAULT_CONSTRUCT_ID,
  userConstructs = NO_USER_CONSTRUCTS,
  label = NEW_CHAT_COPY.constructLabel,
}: {
  readonly defaultConstructId?: ConstructId | OwnPromptId;
  readonly userConstructs?: readonly OwnConstructChoice[];
  readonly label?: string;
}): JSX.Element {
  const labelId = useId();
  const listId = useId();
  const builtInId = useId();
  const ownId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const choices: readonly ConstructChoice[] = [
    ...BUILT_IN_CHOICES,
    ...userConstructs.map(({ id, name }) => ({
      id,
      name,
      description: NEW_CHAT_COPY.ownConstructDescription,
      own: true,
    })),
  ];
  const count = choices.length;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      choices.findIndex(({ id }) => id === defaultConstructId),
    ),
  );
  const [open, setOpen] = useState(false);

  // Opening the list takes the keyboard to the chosen construct in it.
  useEffect(() => {
    if (open === false) {
      return;
    }
    const current = listRef.current?.querySelector<HTMLElement>(
      '[aria-current="true"]',
    );
    current?.focus({ preventScroll: true });
    current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const previous = useCallback((): void => {
    setIndex((shown) => (shown - 1 + count) % count);
  }, [count]);
  const next = useCallback((): void => {
    setIndex((shown) => (shown + 1) % count);
  }, [count]);
  const close = useCallback((): void => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);
  const toggle = useCallback((): void => {
    if (open === true) {
      close();
      return;
    }
    setOpen(true);
  }, [open, close]);
  const choose = useCallback(
    (choiceIndex: number): void => {
      setIndex(choiceIndex);
      close();
    },
    [close],
  );
  const moveInList = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, choiceIndex: number): void => {
      const buttons = Array.from(
        listRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? [],
      );
      let target: number | undefined;
      switch (event.key) {
        case "ArrowDown":
          target = (choiceIndex + 1) % buttons.length;
          break;
        case "ArrowUp":
          target = (choiceIndex - 1 + buttons.length) % buttons.length;
          break;
        case "Home":
          target = 0;
          break;
        case "End":
          target = buttons.length - 1;
          break;
        case "Escape":
          event.preventDefault();
          close();
          return;
        default:
          return;
      }
      event.preventDefault();
      buttons[target]?.focus();
    },
    [close],
  );

  const chosen = choices[index] ?? BUILT_IN_CHOICES[0];
  if (chosen === undefined) {
    throw new Error("The construct picker has no constructs");
  }

  const options = choices.map((choice, choiceIndex) => (
    <ConstructOption
      choice={choice}
      choiceIndex={choiceIndex}
      current={choiceIndex === index}
      key={choice.id}
      onChoose={choose}
      onKey={moveInList}
    />
  ));
  let ownGroup: JSX.Element | undefined;
  if (userConstructs.length > 0) {
    ownGroup = (
      <>
        <p className="construct-group-label" id={ownId}>
          {NEW_CHAT_COPY.ownConstructs}
        </p>
        <ul aria-labelledby={ownId}>
          {options.slice(BUILT_IN_CHOICES.length)}
        </ul>
      </>
    );
  }
  let list: JSX.Element | undefined;
  let faceClass = "construct-picker-face";
  let toggleLabel: string = NEW_CHAT_COPY.chooseConstructButton;
  let controls: string | undefined;
  if (open === true) {
    faceClass += " invisible";
    toggleLabel = NEW_CHAT_COPY.closeChooser;
    controls = listId;
    list = (
      <div
        className="construct-picker-list"
        data-handles-escape={true}
        id={listId}
        ref={listRef}
      >
        <p className="construct-group-label" id={builtInId}>
          {NEW_CHAT_COPY.builtInConstructs}
        </p>
        <ul aria-labelledby={builtInId}>
          {options.slice(0, BUILT_IN_CHOICES.length)}
        </ul>
        {ownGroup}
      </div>
    );
  }

  return (
    <div className="field">
      <p className="field-label" id={labelId}>
        {label}
      </p>
      <div className="construct-picker">
        <div className={faceClass}>
          <button
            aria-label={NEW_CHAT_COPY.previousConstruct}
            className="construct-picker-bar border-line border-r"
            onClick={previous}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <div aria-live="polite" className="construct-picker-card">
            <ConstructMonogram choice={chosen} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-heading font-medium">
                {chosen.name}
              </span>
              <span className="text-muted text-xs tabular-nums">
                {NEW_CHAT_COPY.constructPosition(index + 1, count)}
              </span>
              <p className="construct-picker-description">
                {chosen.description}
              </p>
            </div>
          </div>
          <button
            aria-label={NEW_CHAT_COPY.nextConstruct}
            className="construct-picker-bar border-line border-l"
            onClick={next}
            type="button"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
        {list}
      </div>
      <button
        aria-controls={controls}
        aria-describedby={labelId}
        aria-expanded={open}
        className="button-quiet self-start"
        onClick={toggle}
        ref={toggleRef}
        type="button"
      >
        {toggleLabel}
      </button>
      <input name="constructId" type="hidden" value={chosen.id} />
    </div>
  );
}

export { ConstructPicker };
