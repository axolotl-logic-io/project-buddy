"use client";

import Link from "next/link";
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
import { ProgressRing } from "@/components/experience/progress-ring.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { Experience } from "@/experience/experience.ts";
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

// Keep the previous total in the root layout so replacing a route's header
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
      <div className="experience-feedback" role="status">
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

// The user's circle in the site header: its number inside a ring that fills
// as they near the next circle, linking to Profile's Experience section.
// The ring is decoration: the link's name says the circle, its title and the
// experience still needed.
function CircleProgress({
  experience,
}: {
  readonly experience: Experience;
}): JSX.Element {
  const { circle, title, nextCircleStart } = experience;
  return (
    <Link
      aria-label={EXPERIENCE_COPY.progress(
        circle,
        title,
        nextCircleStart - experience.experience,
        circle + 1,
      )}
      className="circle-progress"
      href="/profile#experience"
    >
      <span aria-hidden="true" className="circle-progress-ring">
        <ProgressRing experience={experience} />
        <span className="circle-progress-number">{circle}</span>
      </span>
      <span aria-hidden="true" className="circle-progress-title">
        {title}
      </span>
    </Link>
  );
}

export { CircleProgress, ExperienceFeedback, ReportExperienceTotal };
