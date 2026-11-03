"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import {
  declineProjectInvitation,
  joinProject,
} from "@/projects/project-invitations.ts";

// Ids are checked by the store, which finds nothing for a malformed one.
const ANSWER_FORM = z.object({ invitationId: z.string() });

// The invitation id the form names, or not found.
function invitationIdOf(formData: FormData): string {
  const form = ANSWER_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  return form.data.invitationId;
}

// Joins the project her pending invitation is to, and opens it. An
// invitation that is answered, revoked, unknown or someone else's is not
// found.
export async function joinProjectAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const projectId = await joinProject(user.id, invitationIdOf(formData));
  if (projectId === undefined) {
    notFound();
  }
  return redirect(`/projects/${projectId}`);
}

// Declines her pending invitation, and shows her projects. An invitation
// that is answered, revoked, unknown or someone else's is not found.
export async function declineProjectInvitationAction(
  formData: FormData,
): Promise<never> {
  const user = await requireUser();
  if (!(await declineProjectInvitation(user.id, invitationIdOf(formData)))) {
    notFound();
  }
  return redirect("/projects");
}
