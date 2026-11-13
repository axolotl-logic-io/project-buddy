"use client";

import { Accordion } from "radix-ui";
import {
  type JSX,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PlanSteps } from "@/components/plan/plan-steps.tsx";
import { usePlan } from "@/components/plan/use-plan.ts";
import { Button } from "@/components/ui/button.tsx";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

type PanelSize = "minimized" | "medium" | "full";

function PlanPanel({
  children,
  sideContent,
  initialSection = "plan",
}: {
  readonly children?: ReactNode;
  readonly sideContent?: ReactNode;
  readonly initialSection?: string | undefined;
}): JSX.Element {
  const plan = usePlan();
  const [size, setSize] = useState<PanelSize>("medium");
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (dialog.open) {
      dialog.close();
    }
    if (size === "full") {
      dialog.showModal();
    } else {
      dialog.show();
    }
  }, [size]);
  const cancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>): void => {
      event.preventDefault();
      setSize("medium");
    },
    [],
  );
  const minimize = useCallback((): void => setSize("minimized"), []);
  const medium = useCallback((): void => setSize("medium"), []);
  const full = useCallback((): void => setSize("full"), []);
  return (
    <div className="adventure-layout" data-panel-size={size}>
      <div className="adventure-main">{children}</div>
      <dialog
        ref={dialogRef}
        onCancel={cancel}
        className="quest-sidebar-frame"
        aria-label={QUEST_SIDEBAR_COPY.label}
      >
        <aside className="quest-sidebar" aria-label={QUEST_SIDEBAR_COPY.label}>
          <fieldset
            className="flex flex-wrap gap-2"
            aria-label={QUEST_SIDEBAR_COPY.size}
          >
            <Button
              variant="quiet"
              aria-pressed={size === "minimized"}
              onClick={minimize}
            >
              {QUEST_SIDEBAR_COPY.minimize}
            </Button>
            <Button
              variant="quiet"
              aria-pressed={size === "medium"}
              onClick={medium}
            >
              {QUEST_SIDEBAR_COPY.medium}
            </Button>
            <Button
              variant="quiet"
              aria-pressed={size === "full"}
              onClick={full}
            >
              {QUEST_SIDEBAR_COPY.full}
            </Button>
          </fieldset>
          <div hidden={size === "minimized"}>
            <Accordion.Root
              type="multiple"
              defaultValue={[initialSection]}
              className="flex flex-col gap-3"
            >
              {plan !== undefined && (
                <Accordion.Item value="plan">
                  <Accordion.Header>
                    <Accordion.Trigger className="button-secondary quest-sidebar-trigger">
                      {PLAN_COPY.heading}
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content
                    forceMount={true}
                    className="quest-sidebar-content"
                  >
                    <PlanSteps look="panel" />
                  </Accordion.Content>
                </Accordion.Item>
              )}
              {sideContent}
            </Accordion.Root>
          </div>
        </aside>
      </dialog>
    </div>
  );
}

// Server-rendered sections retain their forms when their accordion is closed.
function QuestSidebarSection({
  name,
  value,
  children,
}: {
  readonly name: string;
  readonly value: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <Accordion.Item value={value}>
      <Accordion.Header>
        <Accordion.Trigger className="button-secondary quest-sidebar-trigger">
          {name}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content forceMount={true} className="quest-sidebar-content">
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
}

export { PlanPanel, QuestSidebarSection };
