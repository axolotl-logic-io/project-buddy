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
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import {
  type BuddyId,
  DEFAULT_BUDDY_ID,
  listBuddies,
} from "@/buddies/index.ts";
import { Icon } from "@/components/ui/icon.tsx";
import type { UserBuddyId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

// A buddy as the picker shows it.
interface BuddyChoice {
  readonly id: BuddyId | UserBuddyId;
  readonly name: string;
  readonly description: string;
  readonly own: boolean;
}

const BUILT_IN_CHOICES: readonly BuddyChoice[] = listBuddies().map(
  ({ id, name, description }) => ({ id, name, description, own: false }),
);

const NO_USER_BUDDIES: readonly OwnBuddyChoice[] = [];

// The words of a name, for its monogram.
const NAME_WORD = /\p{L}+/gu;

// The list's buttons, for moving between them by arrow key.
const OPTION_SELECTOR = "button[data-choice]";

// The first letters of a name's first two words, such as "MT" for Mr. Tee.
function monogram(name: string): string {
  return Array.from(name.matchAll(NAME_WORD), ([word]) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// A buddy's initials in a circle, in the accent colour for one of the
// user's own.
function BuddyMonogram({
  choice,
  small = false,
}: {
  readonly choice: BuddyChoice;
  readonly small?: boolean;
}): JSX.Element {
  let className = "buddy-monogram";
  if (choice.own === true) {
    className += " buddy-monogram-own";
  }
  if (small === true) {
    className += " buddy-monogram-small";
  }
  return (
    <span aria-hidden={true} className={className}>
      {monogram(choice.name)}
    </span>
  );
}

// One buddy in the picker's list, as a button that chooses it, named by the
// buddy's name and described by the first line of a built-in buddy's
// description.
function BuddyOption({
  choice,
  choiceIndex,
  current,
  onChoose,
  onKey,
}: {
  readonly choice: BuddyChoice;
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
      <span className="buddy-option-description" id={descriptionId}>
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
        className="buddy-option"
        data-choice={true}
        onClick={choose}
        onKeyDown={key}
        type="button"
      >
        <BuddyMonogram choice={choice} small={true} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{choice.name}</span>
          {description}
        </span>
      </button>
    </li>
  );
}

// A form's choice of buddy, sent as `buddyId`: the built-in buddies,
// then any of the user's own given, with defaultBuddyId, or else the
// default buddy, chosen to start with. It shows the chosen buddy's card,
// between buttons to the previous and next buddy, which wrap round at
// either end. "Choose a buddy" puts the list of every buddy in the card's
// place, at the card's height, so nothing around the picker moves; choosing
// one, or Escape, puts the card back.
function BuddyPicker({
  defaultBuddyId = DEFAULT_BUDDY_ID,
  userBuddies = NO_USER_BUDDIES,
  label = NEW_CHAT_COPY.buddyLabel,
}: {
  readonly defaultBuddyId?: BuddyId | UserBuddyId;
  readonly userBuddies?: readonly OwnBuddyChoice[];
  readonly label?: string;
}): JSX.Element {
  const labelId = useId();
  const listId = useId();
  const builtInId = useId();
  const ownId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const choices: readonly BuddyChoice[] = [
    ...BUILT_IN_CHOICES,
    ...userBuddies.map(({ id, name }) => ({
      id,
      name,
      description: NEW_CHAT_COPY.ownBuddyDescription,
      own: true,
    })),
  ];
  const count = choices.length;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      choices.findIndex(({ id }) => id === defaultBuddyId),
    ),
  );
  const [open, setOpen] = useState(false);

  // Opening the list takes the keyboard to the chosen buddy in it.
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
    throw new Error("The buddy picker has no buddies");
  }

  const options = choices.map((choice, choiceIndex) => (
    <BuddyOption
      choice={choice}
      choiceIndex={choiceIndex}
      current={choiceIndex === index}
      key={choice.id}
      onChoose={choose}
      onKey={moveInList}
    />
  ));
  let ownGroup: JSX.Element | undefined;
  if (userBuddies.length > 0) {
    ownGroup = (
      <>
        <p className="buddy-group-label" id={ownId}>
          {NEW_CHAT_COPY.ownBuddies}
        </p>
        <ul aria-labelledby={ownId}>
          {options.slice(BUILT_IN_CHOICES.length)}
        </ul>
      </>
    );
  }
  let list: JSX.Element | undefined;
  let faceClass = "buddy-picker-face";
  let toggleLabel: string = NEW_CHAT_COPY.chooseBuddyButton;
  let controls: string | undefined;
  if (open === true) {
    faceClass += " invisible";
    toggleLabel = NEW_CHAT_COPY.closeChooser;
    controls = listId;
    list = (
      <div className="buddy-picker-list" id={listId} ref={listRef}>
        <p className="buddy-group-label" id={builtInId}>
          {NEW_CHAT_COPY.builtInBuddies}
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
      <div className="buddy-picker">
        <div className={faceClass}>
          <button
            aria-label={NEW_CHAT_COPY.previousBuddy}
            className="buddy-picker-bar border-line border-r"
            onClick={previous}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <div aria-live="polite" className="buddy-picker-card">
            <BuddyMonogram choice={chosen} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-heading font-medium">
                {chosen.name}
              </span>
              <span className="text-muted text-xs tabular-nums">
                {NEW_CHAT_COPY.buddyPosition(index + 1, count)}
              </span>
              <p className="buddy-picker-description">{chosen.description}</p>
            </div>
          </div>
          <button
            aria-label={NEW_CHAT_COPY.nextBuddy}
            className="buddy-picker-bar border-line border-l"
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
      <input name="buddyId" type="hidden" value={chosen.id} />
    </div>
  );
}

export { BuddyPicker };
