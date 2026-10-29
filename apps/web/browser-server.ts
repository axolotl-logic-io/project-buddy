// Where the Playwright tests (e2e/) find their browsers: the server
// compose.browsers.yml runs in Playwright's Linux image, so pages render
// alike on every host (`os-neutral-browsers`). `<loopback>` sends a page's
// requests for the host's localhost (the site under test) back through the
// connection, so the container needs no route to the host.
const BROWSER_SERVER_PORT = 3333;

const BROWSER_SERVER = {
  wsEndpoint: `ws://127.0.0.1:${BROWSER_SERVER_PORT}/`,
  exposeNetwork: "<loopback>",
} as const;

export { BROWSER_SERVER };
