import {
  apiData,
  apiNotFound,
  apiProblem,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import {
  listPerformances,
  PERFORMANCE_ID,
  PERFORMANCE_MESSAGE,
  readPerformanceMessages,
  sendMessage,
  stopPerformance,
} from "@/performances/performance-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

interface PerformanceParams extends QuestParams {
  readonly performanceId: string;
}

const SEND_MESSAGE = PERFORMANCE_MESSAGE.omit({ performanceId: true });

export const GET = questRoute(
  async ({
    user,
    quest,
    params,
  }: QuestCall<PerformanceParams>): Promise<Response> => {
    const performances = await listPerformances(user.id, quest.id);
    const performance = performances.find(
      ({ id }) => id === params.performanceId,
    );
    if (performance === undefined) {
      return apiNotFound();
    }
    return apiData({
      ...performance,
      messages: await readPerformanceMessages(user.id, performance.id),
    });
  },
);

export const POST = questRoute(
  async ({
    user,
    quest,
    params,
    request,
  }: QuestCall<PerformanceParams>): Promise<Response> => {
    const performanceId = PERFORMANCE_ID.safeParse(params.performanceId).data;
    if (performanceId === undefined) {
      return apiNotFound();
    }
    const input = await readApiBody(request, SEND_MESSAGE);
    if (input instanceof Response) {
      return input;
    }
    const entry = await sendMessage(user.id, quest.id, {
      ...input,
      performanceId,
    });
    if (entry === undefined) {
      return apiProblem("performance_required", PERFORMANCE_COPY.required);
    }
    return apiData(entry);
  },
);

export const DELETE = questRoute(
  async ({
    user,
    quest,
    params,
  }: QuestCall<PerformanceParams>): Promise<Response> => {
    const id = PERFORMANCE_ID.safeParse(params.performanceId).data;
    if (id === undefined || !(await stopPerformance(user.id, quest.id, id))) {
      return apiNotFound();
    }
    return apiData({ id });
  },
);
