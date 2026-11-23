import {
  type Construct,
  getConstruct,
  isConstructId,
  listConstructs,
} from "@/constructs/index.ts";
import type { UserId } from "@/ids.ts";

// A built-in construct assigned by a premade quest.
interface ConstructView {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly builtIn: boolean;
}

function builtInConstructView(construct: Construct): ConstructView {
  return {
    id: construct.id,
    name: construct.name,
    description: construct.description,
    builtIn: true,
  };
}

function listConstructViews(_owner: UserId): Promise<ConstructView[]> {
  return Promise.resolve(listConstructs().map(builtInConstructView));
}

function findConstructView(
  _owner: UserId,
  id: string,
): Promise<ConstructView | undefined> {
  if (isConstructId(id)) {
    return Promise.resolve(builtInConstructView(getConstruct(id)));
  }
  return Promise.resolve(undefined);
}

export type { ConstructView };
export { findConstructView, listConstructViews };
