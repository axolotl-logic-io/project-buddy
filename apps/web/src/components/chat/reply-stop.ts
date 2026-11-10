// A reply that runs, as the composer offers to stop it: Stop reply calls
// onStop, which asks the server to stop it, and stopping is true from then
// until the server answers.
interface ReplyStop {
  readonly stopping: boolean;
  readonly onStop: () => Promise<void>;
}

export type { ReplyStop };
