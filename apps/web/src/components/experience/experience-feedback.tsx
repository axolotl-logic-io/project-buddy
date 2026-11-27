"use client";

import {
  createContext,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { UserId } from "@/ids.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";

interface ExperienceSnapshot {
  readonly user: UserId;
  readonly total: number;
}

interface ExperienceGain {
  readonly total: number;
  readonly amount: number;
}

const GAIN_DISPLAY_MS = 2500;
const ExperienceContext = createContext<
  ((snapshot: ExperienceSnapshot | undefined) => void) | undefined
>(undefined);

// Keep the previous total in the shared site layout so replacing a route's header
// preserves the baseline. The first total for each account sets that baseline.
function ExperienceFeedback({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const previousRef = useRef<ExperienceSnapshot | undefined>(undefined);
  const [gain, setGain] = useState<ExperienceGain | undefined>(undefined);
  const report = useCallback(
    (snapshot: ExperienceSnapshot | undefined): void => {
      const before = previousRef.current;
      previousRef.current = snapshot;
      if (snapshot === undefined || before?.user !== snapshot.user) {
        setGain(undefined);
        return;
      }
      const amount = snapshot.total - before.total;
      if (amount > 0) {
        setGain({ total: snapshot.total, amount });
      } else if (amount < 0) {
        setGain(undefined);
      }
    },
    [],
  );

  useEffect(() => {
    if (gain === undefined) {
      return;
    }
    const timeout = setTimeout(() => setGain(undefined), GAIN_DISPLAY_MS);
    return (): void => clearTimeout(timeout);
  }, [gain]);

  return (
    <ExperienceContext value={report}>
      {children}
      <div
        aria-label={EXPERIENCE_COPY.heading}
        className="experience-feedback"
        role="status"
      >
        {gain !== undefined && (
          <Notice key={gain.total}>
            <span className="icon-line">
              <Icon name="sparkle" />
              {EXPERIENCE_COPY.worth(gain.amount)}
            </span>
          </Notice>
        )}
      </div>
    </ExperienceContext>
  );
}

// The signed-in header already reads experience after saves and replies.
function ReportExperienceTotal({
  snapshot,
}: {
  readonly snapshot?: ExperienceSnapshot;
}): null {
  const report = useContext(ExperienceContext);
  useEffect(() => {
    report?.(snapshot);
  }, [report, snapshot]);
  return null;
}

export { ExperienceFeedback, ReportExperienceTotal };
