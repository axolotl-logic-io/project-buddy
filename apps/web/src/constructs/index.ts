import { argonSprangler } from "@/constructs/argon-sprangler.ts";
import {
  CONSTRUCT_IDS,
  type Construct,
  type ConstructId,
  type ConstructSnapshot,
} from "@/constructs/construct.ts";
import { fjordTines } from "@/constructs/fjord-tines.ts";
import { hippy } from "@/constructs/hippy.ts";
import { mrTee } from "@/constructs/mr-tee.ts";
import { rolandDustchain } from "@/constructs/roland-dustchain.ts";
import { spanTines } from "@/constructs/span-tines.ts";

const CONSTRUCT_ID_SET: ReadonlySet<string> = new Set<string>(CONSTRUCT_IDS);

const constructsById: Readonly<Record<ConstructId, Construct>> = {
  hippy,
  "mr-tee": mrTee,
  "fjord-tines": fjordTines,
  "span-tines": spanTines,
  "argon-sprangler": argonSprangler,
  "roland-dustchain": rolandDustchain,
};

export type {
  Construct,
  ConstructDefinition,
  ConstructId,
  ConstructSnapshot,
} from "@/constructs/construct.ts";

export const DEFAULT_CONSTRUCT_ID: ConstructId = "hippy";

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
