import { afterEach, describe, expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ConstructEditor } from "@/components/constructs/construct-editor.tsx";
import { ConstructVisualGeneration } from "@/components/constructs/construct-visual-generation.tsx";
import { keepLocalDraft, readLocalDraft } from "@/components/local-draft.ts";
import { restoreVisualAction } from "@/constructs/restore-visual-action.ts";
import type {
  VisualGenerationQuote,
  VisualGenerationResult,
} from "@/constructs/visual-generation-contract.ts";
import { VISUAL_GENERATION_REQUEST } from "@/constructs/visual-generation-contract.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { VELLUM_CLONE } from "../../app/phone-pages-fixtures.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../../touch-targets-test-kit.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../../viewports-test-kit.ts";
import { refresh } from "../router-test-kit.ts";

vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const RESERVATION = 123;
const PENDING_ID = "3bb055fe-90cc-49fd-b5c5-8f9a9382c507";
const construct = {
  ...VELLUM_CLONE,
  definition: {
    ...VELLUM_CLONE.definition,
    visual: {
      version: 1,
      description: "A brass guide",
      canonical: { kind: "built-in", artwork: "vellum-v1" },
    },
  },
} as const;
function outcome(
  status: VisualGenerationResult["status"],
): VisualGenerationResult {
  return {
    status,
    reservationGold: RESERVATION,
    roles: {
      avatar: "generated",
      portrait: "generated",
      opening: "generated",
      working: "failed",
    },
  };
}
function quote(
  extra: Partial<VisualGenerationQuote> = {},
): VisualGenerationQuote {
  return {
    reservationGold: RESERVATION,
    available: true,
    outdated: false,
    ...extra,
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
  localStorage.clear();
});

function service(
  initial: VisualGenerationQuote,
  result: VisualGenerationResult,
  persisted: string[] = [],
): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetcher = vi.fn<typeof fetch>((_input, init) => {
    if (init?.method === "POST") {
      persisted.push(
        JSON.stringify(
          Object.fromEntries(
            Object.keys(localStorage).map((key) => [
              key,
              localStorage.getItem(key),
            ]),
          ),
        ),
      );
      return Promise.resolve(Response.json(result));
    }
    return Promise.resolve(Response.json(initial));
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
function button(label: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: label, exact: true });
}

describe("use_case_generate_construct_images", () => {
  test("unsaved appearance enables generation and shows the quote and all roles", async () => {
    const fetcher = service(quote(), outcome("generated"));
    await render(
      <ConstructVisualGeneration
        construct={construct}
        viewer="viewer"
        changed={true}
        draftDescription="An unsaved silver guide"
      />,
    );
    await expect
      .element(page.getByText(VISUAL_COPY.reservation(RESERVATION)))
      .toBeVisible();
    await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
    await Promise.all(
      Object.values(VISUAL_COPY.roles).map((role) =>
        expect.element(page.getByText(role, { exact: true })).toBeVisible(),
      ),
    );
    await button(VISUAL_COPY.generate).click();
    await expect
      .element(page.getByText(VISUAL_COPY.states.generated))
      .toBeVisible();
    const posts = fetcher.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(posts[0]?.[1]?.body).toContain(
      '"description":"An unsaved silver guide"',
    );
  });
  test("success applies previews, persists UUID before POST and does not save drafts", async () => {
    const result = {
      ...outcome("generated"),
      visual: { version: 1, description: "A new guide" },
    } satisfies VisualGenerationResult;
    const persisted: string[] = [];
    const fetcher = service(quote(), result, persisted);
    await render(
      <ConstructVisualGeneration
        construct={construct}
        viewer="viewer"
        changed={false}
      />,
    );
    await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
    await button(VISUAL_COPY.generate).click();
    await expect
      .element(page.getByText(VISUAL_COPY.states.generated))
      .toBeVisible();
    const posts = fetcher.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(persisted[0]).toContain("requestId");
    expect(posts[0]?.[1]?.body).toContain('"description":"A brass guide"');
    await expect
      .element(page.getByText("Failed", { exact: true }))
      .toBeVisible();
  });
  test.each(["failed", "outOfGold", "unavailable", "stale"] as const)(
    "%s preserves good images and offers an explicit new retry",
    async (status) => {
      const fetcher = service(quote(), outcome(status));
      await render(
        <ConstructVisualGeneration
          construct={construct}
          viewer="viewer"
          changed={false}
        />,
      );
      await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
      await button(VISUAL_COPY.generate).click();
      await expect
        .element(page.getByText(VISUAL_COPY.states[status]))
        .toBeVisible();
      await expect.element(button(VISUAL_COPY.retry)).toBeEnabled();
      await button(VISUAL_COPY.retry).click();
      const posts = fetcher.mock.calls.filter(
        ([, init]) => init?.method === "POST",
      );
      expect(posts).toHaveLength(2);
      expect(posts[0]?.[1]?.body).not.toEqual(posts[1]?.[1]?.body);
      const image = page
        .getByRole("img", { name: construct.name })
        .first()
        .element()
        .querySelector("img");
      expect(image?.getAttribute("src")).toContain("/constructs/vellum-v1-");
    },
  );
  test("pending reload recovery and status checks never POST", async () => {
    const pending = outcome("pending");
    const fetcher = service(
      quote({ pendingRequestId: PENDING_ID, result: pending }),
      pending,
    );
    const screen = await render(
      <ConstructVisualGeneration
        construct={construct}
        viewer="viewer"
        changed={false}
      />,
    );
    await expect.element(button(VISUAL_COPY.check)).toBeVisible();
    await expect.element(button(VISUAL_COPY.generate)).toBeDisabled();
    await screen.unmount();
    await render(
      <ConstructVisualGeneration
        construct={construct}
        viewer="viewer"
        changed={false}
      />,
    );
    await button(VISUAL_COPY.check).click();
    expect(
      fetcher.mock.calls.every(([, init]) => init?.method !== "POST"),
    ).toBe(true);
    expect(
      fetcher.mock.calls.some(([input]) => String(input).includes(PENDING_ID)),
    ).toBe(true);
  });
});

for (const mode of ["light", "dark"]) {
  test(`visual controls fit 320px in ${mode} without motion`, async () => {
    await commands.reduceMotion();
    applyTheme("parchment", mode);
    await setViewport(NARROWEST_VIEWPORT);
    service(quote({ outdated: true }), outcome("generated"));
    const screen = await render(
      <ConstructVisualGeneration
        construct={construct}
        viewer="phone"
        changed={false}
      />,
    );
    await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
    expect(pageScrollWidth()).toBeLessThanOrEqual(NARROWEST_VIEWPORT.width);
    expect(smallTargets(await measureTargets())).toEqual([]);
    expect(
      globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ).toBe(true);
    expect(
      Array.from(
        screen.container.querySelectorAll("*"),
        (element) => getComputedStyle(element).animationName,
      ).every((name) => name === "none"),
    ).toBe(true);
    await expect.element(page.getByText(VISUAL_COPY.outdated)).toBeVisible();
  });
}

test("a lost paid response blocks resubmission until read-only recovery", async () => {
  let readResult = quote();
  const fetcher = vi.fn<typeof fetch>((_input, init) => {
    if (init?.method === "POST") {
      return Promise.reject(new Error("connection lost"));
    }
    return Promise.resolve(Response.json(readResult));
  });
  vi.stubGlobal("fetch", fetcher);
  const screen = await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="lost"
      changed={false}
    />,
  );
  await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
  await button(VISUAL_COPY.generate).click();
  await expect.element(page.getByText(VISUAL_COPY.unknown)).toBeVisible();
  await expect.element(button(VISUAL_COPY.generate)).toBeDisabled();
  await screen.unmount();
  readResult = quote({ result: outcome("failed") });
  await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="lost"
      changed={false}
    />,
  );
  await expect.element(button(VISUAL_COPY.retry)).toBeEnabled();
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);
});

test("a running request announces per-role progress and blocks repeated submission", async () => {
  const response = Promise.withResolvers<Response>();
  const fetcher = vi.fn<typeof fetch>((_input, init) => {
    if (init?.method === "POST") {
      return response.promise;
    }
    return Promise.resolve(Response.json(quote()));
  });
  vi.stubGlobal("fetch", fetcher);
  await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="running"
      changed={false}
    />,
  );
  await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
  await button(VISUAL_COPY.generate).click();
  await expect
    .element(page.getByText(VISUAL_COPY.states.pending))
    .toBeVisible();
  await expect.element(button(VISUAL_COPY.generate)).toBeDisabled();
  expect(page.getByText("Pending", { exact: true }).elements()).toHaveLength(
    Object.keys(VISUAL_COPY.roles).length,
  );
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);
  response.resolve(Response.json(outcome("generated")));
  await expect
    .element(page.getByText(VISUAL_COPY.states.generated))
    .toBeVisible();
});

test("provider unavailability can be checked again without starting paid work", async () => {
  let available = false;
  const fetcher = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json(quote({ available }))),
  );
  vi.stubGlobal("fetch", fetcher);
  await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="availability"
      changed={false}
    />,
  );
  await expect
    .element(page.getByText(VISUAL_COPY.states.unavailable))
    .toBeVisible();
  await expect.element(button(VISUAL_COPY.generate)).toBeDisabled();
  available = true;
  await button(VISUAL_COPY.check).click();
  await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
  expect(fetcher.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(
    true,
  );
});

test("a removed construct stops generation and keeps a known not-found result", async () => {
  service(quote(), outcome("not-found"));
  await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="removed"
      changed={false}
    />,
  );
  await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
  await button(VISUAL_COPY.generate).click();
  await expect
    .element(page.getByText(VISUAL_COPY.states["not-found"]))
    .toBeVisible();
  await expect.element(button(VISUAL_COPY.retry)).toBeDisabled();
});

test("an unclaimed lost request resumes explicitly with identical UUID and payload after reload", async () => {
  const bodies: unknown[] = [];
  const fetcher = vi.fn<typeof fetch>((input, init) => {
    if (init?.method === "POST") {
      bodies.push(init.body);
      if (bodies.length === 1) {
        return Promise.reject(new Error("failed before claim"));
      }
      return Promise.resolve(Response.json(outcome("generated")));
    }
    if (String(input).includes("requestId=")) {
      return Promise.resolve(
        Response.json(quote({ result: outcome("not-found") })),
      );
    }
    return Promise.resolve(Response.json(quote()));
  });
  vi.stubGlobal("fetch", fetcher);
  const screen = await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="unclaimed"
      changed={false}
    />,
  );
  await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
  await button(VISUAL_COPY.generate).click();
  await expect.element(page.getByText(VISUAL_COPY.unknown)).toBeVisible();
  await screen.unmount();
  await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="unclaimed"
      changed={false}
    />,
  );
  await expect.element(page.getByText(VISUAL_COPY.unclaimed)).toBeVisible();
  await expect.element(button(VISUAL_COPY.resume)).toBeEnabled();
  expect(bodies).toHaveLength(1);
  await button(VISUAL_COPY.resume).click();
  await expect
    .element(page.getByText(VISUAL_COPY.states.generated))
    .toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
});

test("an inaccessible construct is distinct from a missing claim and cannot be resumed", async () => {
  let submitted = false;
  const fetcher = vi.fn<typeof fetch>((_input, init) => {
    if (init?.method === "POST") {
      submitted = true;
      return Promise.reject(new Error("lost"));
    }
    if (submitted) {
      return Promise.resolve(new Response("not-found", { status: 404 }));
    }
    return Promise.resolve(Response.json(quote()));
  });
  vi.stubGlobal("fetch", fetcher);
  await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="foreign"
      changed={false}
    />,
  );
  await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
  await button(VISUAL_COPY.generate).click();
  await button(VISUAL_COPY.check).click();
  await expect.element(page.getByText(VISUAL_COPY.unknown)).toBeVisible();
  await expect.element(button(VISUAL_COPY.resume)).not.toBeInTheDocument();
  await expect.element(button(VISUAL_COPY.generate)).toBeDisabled();
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);
});

test("unavailable artwork does not block repeated text saves or retain an unstarted paid request", async () => {
  const fetcher = service(
    quote({ available: false, result: outcome("not-found") }),
    outcome("unavailable"),
  );
  localStorage.setItem(
    `draft:visual:unavailable:${construct.id}`,
    JSON.stringify({
      constructId: construct.id,
      requestId: PENDING_ID,
      description: "A brass guide",
    }),
  );
  const submitted: FormData[] = [];
  function save(form: FormData): void {
    submitted.push(form);
  }
  await render(
    <ConstructEditor
      construct={construct}
      viewer="unavailable"
      action={save}
      kind="construct"
      idName="constructId"
      promptId={construct.id}
      savedAt="revision"
      name={construct.name}
      heading="Prompt"
      defaultPrompt={undefined}
      texts={[
        {
          name: "prompt",
          text: construct.definition.prompt,
          label: "Instructions",
          help: "Instructions",
          maxLength: 20_000,
        },
        {
          name: "visualDescription",
          text: "A brass guide",
          label: "Visual description",
          help: "Appearance",
          maxLength: 4000,
        },
      ]}
    />,
  );
  await expect.element(button(PROMPT_COPY.save)).toBeEnabled();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Captain Quill");
  await button(PROMPT_COPY.save).click();
  await expect.poll(() => submitted.length).toBe(1);
  await expect.element(button(PROMPT_COPY.save)).toBeEnabled();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Captain Quill II");
  await button(PROMPT_COPY.save).click();
  await expect.poll(() => submitted.length).toBe(2);
  expect(submitted.map((form) => form.get("name"))).toEqual([
    "Captain Quill",
    "Captain Quill II",
  ]);
  expect(submitted.every((form) => !form.has("visualRequestId"))).toBe(true);
  expect(
    localStorage.getItem(`draft:visual:unavailable:${construct.id}`),
  ).toBeNull();
  await expect.element(button(VISUAL_COPY.resume)).not.toBeInTheDocument();
  expect(fetcher.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(
    true,
  );
});

test("reload recovers the durable pending description even if another tab changed the saved appearance", async () => {
  const original = "The original requested appearance";
  const fetcher = service(
    quote({
      pendingRequestId: PENDING_ID,
      pendingDescription: original,
      result: outcome("pending"),
    }),
    outcome("pending"),
  );
  await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="recovered"
      changed={false}
    />,
  );
  await expect
    .element(page.getByText(VISUAL_COPY.states.pending))
    .toBeVisible();
  expect(
    readLocalDraft(
      `visual:recovered:${construct.id}`,
      VISUAL_GENERATION_REQUEST,
    ),
  ).toEqual({
    constructId: construct.id,
    requestId: PENDING_ID,
    description: original,
  });
  await button(VISUAL_COPY.check).click();
  expect(fetcher.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(
    true,
  );
});

test("restoring previous artwork is explicit, free of generation requests, and blocked by unsaved edits", async () => {
  const fetcher = service(quote({ canRestore: true }), outcome("generated"));
  vi.mocked(restoreVisualAction).mockResolvedValue(true);
  const screen = await render(
    <ConstructVisualGeneration
      construct={construct}
      viewer="viewer"
      changed={true}
    />,
  );
  await expect.element(button(VISUAL_COPY.restore)).toBeDisabled();
  await screen.rerender(
    <ConstructVisualGeneration
      construct={construct}
      viewer="viewer"
      changed={false}
    />,
  );
  await button(VISUAL_COPY.restore).click();
  await expect.element(page.getByText(VISUAL_COPY.restored)).toBeVisible();
  expect(restoreVisualAction).toHaveBeenCalledWith(construct.id);
  // A restore can change bytes without changing the description or editor key.
  await screen.rerender(
    <ConstructVisualGeneration
      construct={{
        ...construct,
        definition: {
          ...construct.definition,
          visual: {
            ...construct.definition.visual,
            canonical: { kind: "built-in", artwork: "lumen-v1" },
          },
        },
      }}
      viewer="viewer"
      changed={false}
    />,
  );
  const previews = page.getByRole("img").elements();
  expect(previews.length).toBeGreaterThan(0);
  expect(
    previews.every((image) =>
      image
        .querySelector("img")
        ?.getAttribute("src")
        ?.includes("/constructs/lumen-v1-"),
    ),
  ).toBe(true);

  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toEqual([]);
});

describe("use_case_see_gold", () => {
  test.each(["generated", "outOfGold", "failed"] as const)(
    "refreshes after %s generation settles",
    async (status) => {
      service(quote(), outcome(status));
      await render(
        <ConstructVisualGeneration
          construct={construct}
          viewer="viewer"
          changed={false}
        />,
      );
      await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
      expect(refresh).not.toHaveBeenCalled();
      await button(VISUAL_COPY.generate).click();
      await expect.poll(() => refresh.mock.calls.length).toBe(1);
      await expect
        .element(page.getByText(VISUAL_COPY.states[status]))
        .toBeVisible();
    },
  );

  test("refreshes after a lost paid response and again when its status is recovered", async () => {
    const fetcher = service(quote(), outcome("pending"));
    fetcher.mockImplementationOnce(() =>
      Promise.resolve(Response.json(quote())),
    );
    await render(
      <ConstructVisualGeneration
        construct={construct}
        viewer="viewer"
        changed={false}
      />,
    );
    await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
    fetcher.mockRejectedValueOnce(new Error("Lost response"));
    await button(VISUAL_COPY.generate).click();
    await expect.poll(() => refresh.mock.calls.length).toBe(1);
    fetcher.mockResolvedValueOnce(
      Response.json(quote({ result: outcome("failed") })),
    );
    await button(VISUAL_COPY.check).click();
    await expect.poll(() => refresh.mock.calls.length).toBe(2);
    await expect
      .element(page.getByText(VISUAL_COPY.states.failed))
      .toBeVisible();
  });
});

test("recovered construct edits generate directly and survive a failure without saving", async () => {
  const fetcher = service(quote(), outcome("failed"));
  const save = vi.fn<(form: FormData) => void>();
  keepLocalDraft(`prompt:draft-editor:buddy:${construct.id}`, {
    basedOn: "revision",
    name: "Unsaved name",
    texts: {
      prompt: "Unsaved voice",
      visualDescription: "Unsaved silver guide",
    },
  });
  await render(
    <ConstructEditor
      construct={construct}
      viewer="draft-editor"
      action={save}
      kind="construct"
      idName="constructId"
      promptId={construct.id}
      savedAt="revision"
      name={construct.name}
      heading="Prompt"
      defaultPrompt={undefined}
      texts={[
        {
          name: "prompt",
          text: construct.definition.prompt,
          label: "Instructions",
          help: "Instructions",
        },
        {
          name: "visualDescription",
          text: "A brass guide",
          label: "Visual description",
          help: "Appearance",
        },
      ]}
    />,
  );
  await expect
    .element(page.getByRole("textbox", { name: "Instructions", exact: true }))
    .toHaveValue("Unsaved voice");
  await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
  await button(VISUAL_COPY.generate).click();
  await expect.element(page.getByText(VISUAL_COPY.states.failed)).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  const posts = fetcher.mock.calls.filter(
    ([, init]) => init?.method === "POST",
  );
  expect(posts).toHaveLength(1);
  expect(posts[0]?.[1]?.body).toContain('"description":"Unsaved silver guide"');
  await expect
    .element(page.getByRole("textbox", { name: "Instructions", exact: true }))
    .toHaveValue("Unsaved voice");
  await button("Visual description").click();
  await expect
    .element(
      page.getByRole("textbox", { name: "Visual description", exact: true }),
    )
    .toHaveValue("Unsaved silver guide");
  expect(
    localStorage.getItem(`draft:prompt:draft-editor:buddy:${construct.id}`),
  ).toContain("Unsaved silver guide");
});

test("first recovered description generates without saving and matching artwork makes Save free", async () => {
  const description = "A first unsaved silver guide";
  const fresh = { ...construct, definition: { prompt: "Saved voice" } };
  const visual = {
    version: 1,
    description,
    sourceFingerprintVersion: 2,
    canonical: { kind: "generated", assetId: PENDING_ID },
  } as const;
  let generated = false;
  const fetcher = vi.fn<typeof fetch>((_input, init) => {
    if (init?.method === "POST") {
      generated = true;
      return Promise.resolve(
        Response.json({ ...outcome("generated"), visual }),
      );
    }
    if (generated) {
      return Promise.resolve(
        Response.json(
          quote({ artworkDescription: description, draftVisual: visual }),
        ),
      );
    }
    return Promise.resolve(Response.json(quote()));
  });
  vi.stubGlobal("fetch", fetcher);
  const saved = Promise.withResolvers<FormData>();
  const save = vi.fn<(form: FormData) => void>((form) => {
    saved.resolve(form);
  });
  keepLocalDraft(`prompt:first-draft:buddy:${construct.id}`, {
    basedOn: "revision",
    name: "Recovered name",
    texts: { prompt: "Recovered voice", visualDescription: description },
  });
  await render(
    <ConstructEditor
      construct={fresh}
      viewer="first-draft"
      action={save}
      kind="construct"
      idName="constructId"
      promptId={construct.id}
      savedAt="revision"
      name={construct.name}
      heading="Prompt"
      defaultPrompt={undefined}
      texts={[
        {
          name: "prompt",
          text: "Saved voice",
          label: "Instructions",
          help: "Instructions",
        },
        {
          name: "visualDescription",
          text: "",
          label: "Visual description",
          help: "Appearance",
        },
      ]}
    />,
  );
  await expect.element(button(VISUAL_COPY.generate)).toBeEnabled();
  await button(VISUAL_COPY.generate).click();
  await expect
    .element(page.getByText(VISUAL_COPY.states.generated))
    .toBeVisible();
  await expect.element(button(PROMPT_COPY.save)).toBeEnabled();
  await expect
    .element(page.getByText(VISUAL_COPY.saveWithoutGeneration))
    .toBeVisible();
  await expect
    .element(page.getByText(VISUAL_COPY.outdated))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole("textbox", { name: "Instructions", exact: true }))
    .toHaveValue("Recovered voice");
  expect(save).not.toHaveBeenCalled();
  await button(PROMPT_COPY.save).click();
  const submittedForm = await saved.promise;
  expect(submittedForm.get("visualDescription")).toBe(description);
  expect(submittedForm.has("visualRequestId")).toBe(false);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);
});
