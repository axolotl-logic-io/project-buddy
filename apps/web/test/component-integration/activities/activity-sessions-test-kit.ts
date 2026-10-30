// For browser tests that render a project's page without the database:
// no project has an interview chat.
function interviewChatOf(): Promise<undefined> {
  return Promise.resolve(undefined);
}

export { interviewChatOf };
