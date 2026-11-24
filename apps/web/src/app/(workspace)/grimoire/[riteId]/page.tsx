import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ForgottenRiteActions } from "@/components/forgotten-rite-actions.tsx";
import { RiteEditor } from "@/components/rite-editor.tsx";
import { Button } from "@/components/ui/button.tsx";
import { changeRiteAction, copyRiteAction } from "@/rites/rite-actions.ts";
import { readRite } from "@/rites/rite-store.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

async function RitePage({
  params,
}: PageProps<"/grimoire/[riteId]">): Promise<JSX.Element> {
  const [user, { riteId }] = await Promise.all([requireUser(), params]);
  if (riteId === "new") {
    return <RiteEditor viewer={user.id} />;
  }
  const rite = await readRite(user.id, riteId, true);
  if (rite === undefined) {
    notFound();
  }
  return (
    <div className="grid gap-3">
      {rite.source === "own" && rite.forgottenAt === undefined && (
        <RiteEditor viewer={user.id} rite={rite} />
      )}
      {(rite.source === "built-in" || rite.forgottenAt !== undefined) && (
        <>
          <section className="grid gap-2">
            <h2 className="section-heading">{GRIMOIRE_COPY.firstMessage}</h2>
            <p className="whitespace-pre-wrap">{rite.firstMessage}</p>
          </section>
          <section className="grid gap-2">
            <h2 className="section-heading">{GRIMOIRE_COPY.replies}</h2>
            <ol className="grid gap-3">
              {Array.from(new Set(rite.replies)).map((reply) => (
                <li key={reply} className="whitespace-pre-wrap">
                  {reply}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
      {rite.forgottenAt === undefined && (
        <form action={copyRiteAction}>
          <input type="hidden" name="id" value={rite.id} />
          <Button type="submit" variant="secondary">
            {GRIMOIRE_COPY.copy}
          </Button>
        </form>
      )}
      {rite.source === "own" && rite.forgottenAt !== undefined && (
        <ForgottenRiteActions id={rite.id} name={rite.name} />
      )}
      {rite.source === "own" && rite.forgottenAt === undefined && (
        <form action={changeRiteAction}>
          <input type="hidden" name="id" value={rite.id} />
          <Button
            type="submit"
            name="change"
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

export default RitePage;
