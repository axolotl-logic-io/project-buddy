// Begin a durable model operation, then settle its charge and accounting
// together. Repeating settlement cannot charge twice. Undefined means billing
// is unknown, and pending operations never mean zero.
interface UsageRecorder {
  readonly begin: () => Promise<(cost: number | undefined) => Promise<void>>;
}

export type { UsageRecorder };
