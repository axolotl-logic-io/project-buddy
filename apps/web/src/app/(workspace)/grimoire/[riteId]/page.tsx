import { notFound } from "next/navigation";
import type { JSX, ReactNode } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { ForgottenRiteActions } from "@/components/forgotten-rite-actions.tsx";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { RiteEditor } from "@/components/rite-editor.tsx";
import {
  PlaceholderLegend,
  RiteSeal,
  RiteText,
} from "@/components/rite-text.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Button } from "@/components/ui/button.tsx";
import type { Rite } from "@/rites/rite.ts";
import { changeRiteAction, copyRiteAction } from "@/rites/rite-actions.ts";
import { readRite } from "@/rites/rite-store.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

// What the rite is to the user, and what the header says beside it.
function RiteFacts({ rite }: { readonly rite: Rite }): JSX.Element {
  let label: string = GRIMOIRE_COPY.sources[rite.source];
  let detail: ReactNode = GRIMOIRE_COPY.readOnly;
  if (rite.forgottenAt !== undefined) {
    label = GRIMOIRE_COPY.sources.forgotten;
    detail = (
      <CopyWithTime
        dateTime={rite.forgottenAt}
        detail="day"
        text={GRIMOIRE_COPY.forgottenOn(TIME_SLOT)}
      />
    );
  } else if (rite.source === "own" && rite.updatedAt !== undefined) {
    detail = (
      <CopyWithTime
        dateTime={rite.updatedAt}
        detail="day"
        text={GRIMOIRE_COPY.editedOn(TIME_SLOT)}
      />
    );
  }
  return (
    <div className="rite-head-text">
      <p className="quests-label">{label}</p>
      <p className="quest-finder-meta rite-head-meta">
        <span>{GRIMOIRE_COPY.replyCount(rite.replies.length)}</span>
        <span>{detail}</span>
      </p>
    </div>
  );
}

// Make a copy for a rite the user may perform, and Forget for one of
// their own; Restore and Delete forever once it is forgotten.
function RiteActions({ rite }: { readonly rite: Rite }): JSX.Element {
  if (rite.forgottenAt !== undefined) {
    return (
      <div className="rite-head-actions">
        <ForgottenRiteActions id={rite.id} name={rite.name} />
      </div>
    );
  }
  let copyVariant: "primary" | "secondary" = "primary";
  if (rite.source === "own") {
    copyVariant = "secondary";
  }
  return (
    <div className="rite-head-actions">
      <form action={copyRiteAction}>
        <input name="id" type="hidden" value={rite.id} />
        <Button type="submit" variant={copyVariant}>
          {GRIMOIRE_COPY.copy}
        </Button>
      </form>
      {rite.source === "own" && (
        <form action={changeRiteAction}>
          <input name="id" type="hidden" value={rite.id} />
          <Button
            name="change"
            type="submit"
            value="forget"
            variant="quiet-danger"
          >
            {GRIMOIRE_COPY.forget}
          </Button>
        </form>
      )}
    </div>
  );
}

// A rite the user may not change: a built-in one, or one they forgot.
function ReadOnlyRite({ rite }: { readonly rite: Rite }): JSX.Element {
  return (
    <>
      <section className="rite-section">
        <h2 className="quests-label">{GRIMOIRE_COPY.firstMessage}</h2>
        <p className="rite-readonly">
          <RiteText text={rite.firstMessage} />
        </p>
      </section>
      <section className="rite-section">
        <h2 className="quests-label">{GRIMOIRE_COPY.replies}</h2>
        <ol className="rite-replies">
          {Array.from(new Set(rite.replies)).map((reply) => (
            <li key={reply}>
              <RiteText text={reply} />
            </li>
          ))}
        </ol>
      </section>
      <PlaceholderLegend />
    </>
  );
}

// A rite: its seal, what it is and its actions, then the user's own
// active rite to edit, or any other to read. Its name is the trail band's.
async function RitePage({
  params,
}: PageProps<"/grimoire/[riteId]">): Promise<JSX.Element> {
  const [user, { riteId }] = await Promise.all([requireUser(), params]);
  if (riteId === "new") {
    return (
      <PageWorkspace>
        <div className="workspace-content rite-workspace">
          <RiteEditor viewer={user.id} />
        </div>
      </PageWorkspace>
    );
  }
  const rite = await readRite(user.id, riteId, true);
  if (rite === undefined) {
    notFound();
  }
  let body = <ReadOnlyRite rite={rite} />;
  if (rite.source === "own" && rite.forgottenAt === undefined) {
    body = <RiteEditor rite={rite} viewer={user.id} />;
  }
  return (
    <PageWorkspace>
      <div className="workspace-content rite-workspace">
        <header className="rite-head">
          <RiteSeal rite={rite} />
          <RiteFacts rite={rite} />
          <RiteActions rite={rite} />
        </header>
        {body}
      </div>
    </PageWorkspace>
  );
}

export default RitePage;
