import {
  type ChangeEvent,
  type RefObject,
  type SubmitEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";

// A field that adds list items one after another: Enter or its button adds
// the text, then empties the field and keeps focus in it, so the next item
// can follow at once. A refused text stays, with the reason.
interface Entry {
  readonly text: string;
  readonly problem: string | undefined;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly change: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly submit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>;
  // Empties the field and drops its problem.
  readonly clear: () => void;
}

function useEntry(
  validate: EditorOptions["validate"],
  add: (text: string) => Promise<boolean>,
): Entry {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setText(event.currentTarget.value);
    setProblem(undefined);
  }, []);
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const checked = validate(text);
      if ("problem" in checked) {
        setProblem(checked.problem);
        inputRef.current?.focus();
        return;
      }
      if (await add(checked.text)) {
        setText("");
      }
      inputRef.current?.focus();
    },
    [add, text, validate],
  );
  const clear = useCallback((): void => {
    setText("");
    setProblem(undefined);
  }, []);
  return { text, problem, inputRef, change, submit, clear };
}

export type { Entry };
export { useEntry };
