import { z } from "zod";
import {
  type ApiCall,
  apiData,
  apiNotFound,
  apiRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { MILESTONE_ID } from "@/ids.ts";
import { MILESTONE_TEXT } from "@/milestones/milestone.ts";
import {
  deleteMilestone,
  editMilestone,
} from "@/milestones/milestone-store.ts";

interface MilestoneParams {
  readonly milestoneId: string;
}

const EDIT_BODY = z.object({ text: MILESTONE_TEXT });

// Changes the milestone's text, keeping its date and conversation.
export const PATCH = apiRoute(
  async ({
    user,
    request,
    params,
  }: ApiCall<MilestoneParams>): Promise<Response> => {
    const id = MILESTONE_ID.safeParse(params.milestoneId);
    if (!id.success) {
      return apiNotFound();
    }
    const body = await readApiBody(request, EDIT_BODY);
    if (body instanceof Response) {
      return body;
    }
    if (!(await editMilestone(user.id, id.data, body.text))) {
      return apiNotFound();
    }
    return apiData({ id: id.data, text: body.text });
  },
);

// Deletes the milestone. Deleting one that is gone changes nothing, so a
// retry succeeds.
export const DELETE = apiRoute(
  async ({ user, params }: ApiCall<MilestoneParams>): Promise<Response> => {
    const id = MILESTONE_ID.safeParse(params.milestoneId);
    if (id.success) {
      await deleteMilestone(user.id, id.data);
    }
    return apiData({ id: params.milestoneId });
  },
);
