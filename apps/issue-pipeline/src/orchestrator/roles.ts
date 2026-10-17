// The pipeline role that starts each stage, and the roles one orchestrator
// runs (#417): the --roles flag's, else the config's orchestratorRoles, else
// all of them. An issue whose next stage belongs to a role that isn't
// running is held `role-off:<role>`. Pure.
//
// Stub: the spec for #417 describes the behaviour; the implementer writes it.

import type { Config } from "../config.ts";
import type { RoleName } from "../roles/registry.ts";
import type { StageName } from "../workflow/stages/types.ts";

// The role that starts `stage`, by the names in ROLE_NAMES.
function roleOfStage(stage: StageName): RoleName {
  throw new Error(`roleOfStage is not implemented (${stage})`);
}

// The roles to run, in ROLE_NAMES order: the flag's, else the config's
// orchestratorRoles, else all five. Throws, naming it, on an unknown or empty
// role name.
function rolesOf(
  args: { roles?: readonly string[] | undefined },
  cfg: Config,
): RoleName[] {
  throw new Error(
    `rolesOf is not implemented (${String(args.roles)}, ${cfg.repo})`,
  );
}

export { roleOfStage, rolesOf };
