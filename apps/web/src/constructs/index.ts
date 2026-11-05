import {
  CONSTRUCT_IDS,
  type Construct,
  type ConstructId,
  type ConstructSnapshot,
} from "@/constructs/construct.ts";
import { lumen } from "@/constructs/lumen.ts";
import { vellum } from "@/constructs/vellum.ts";

const CONSTRUCT_ID_SET: ReadonlySet<string> = new Set<string>(CONSTRUCT_IDS);

const constructsById: Readonly<Record<ConstructId, Construct>> = {
  vellum,
  lumen,
};

export type {
  Construct,
  ConstructDefinition,
  ConstructId,
  ConstructSnapshot,
} from "@/constructs/construct.ts";

export const DEFAULT_CONSTRUCT_ID: ConstructId = "vellum";

export function isConstructId(id: string): id is ConstructId {
  return CONSTRUCT_ID_SET.has(id);
}

export function listConstructs(): Construct[] {
  return CONSTRUCT_IDS.map((id) => constructsById[id]);
}

export function getConstruct(id: ConstructId): Construct {
  return constructsById[id];
}

export function snapshotOf({
  name,
  definition: parts,
}: ConstructSnapshot): ConstructSnapshot {
  return { name, definition: parts };
}
