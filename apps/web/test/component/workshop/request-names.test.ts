// A workshop test request crosses builds during a release and after a
// rollback: a page from either build can reach either server. The page writes
// the construct names both builds read, and the server reads both.
import { expect, test } from "vitest";
import {
  WORKSHOP_REQUEST,
  type WorkshopRequest,
  workshopRequestBody,
} from "@/workshop/protocol.ts";

const REQUEST: WorkshopRequest = {
  draft: {
    kind: "construct",
    id: "vellum",
    name: "Vellum",
    prompt: "# Construct: Vellum",
    whenToUse: "",
    openingRequest: "",
  },
  constructId: "vellum",
  activityId: "open-chat",
  forceCast: false,
  opening: false,
  history: [],
  castIds: [],
  message: "Hello",
};

test("a page writes the draft's stored kind and both names for the construct", () => {
  const body: unknown = JSON.parse(workshopRequestBody(REQUEST));

  expect(body).toMatchObject({
    draft: { kind: "buddy" },
    constructId: "vellum",
    buddyId: "vellum",
  });
  expect(WORKSHOP_REQUEST.parse(body)).toEqual(REQUEST);
});

test("the server reads a request from a page of the earlier build", () => {
  const { constructId, ...rest } = REQUEST;
  const earlier = {
    ...rest,
    draft: { ...REQUEST.draft, kind: "buddy" },
    buddyId: constructId,
  };

  expect(WORKSHOP_REQUEST.parse(earlier)).toEqual(REQUEST);
});

test("the server reads a request that names only the current names", () => {
  expect(WORKSHOP_REQUEST.parse(REQUEST)).toEqual(REQUEST);
});
