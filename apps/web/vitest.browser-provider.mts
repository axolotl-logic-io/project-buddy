// The browser projects' provider: Playwright, launching Chromium and WebKit
// on the host. In a Docker browser server, each WebKit
// page process grew to about 1 GB at 80% CPU in Docker's virtual machine,
// tests that take half a second on the host ran past the 15 s test timeout,
// and the whole browser suite took 773 s rather than 47 s (2026-10-29).
//
// It changes one thing in Vitest's Playwright provider. When a test file's
// vi.mock module fails to resolve, that provider rejects inside a Playwright
// route handler, where nothing catches it, and Vitest exits on the
// unhandled rejection: the run stops with no summary and no report, and the
// mock's error is never printed. A factory that throws does this, and so
// does any mock still loading when Vitest closes a frozen page's
// connection. Here the project's logger prints such a mock's error, and the
// mock resolves to no exports. The page then imports the module's mock
// source, which fails, so only that test file fails, and the run goes on to
// its summary.
import {
  type PlaywrightProviderOptions,
  playwright,
} from "@vitest/browser-playwright";
import type {
  BrowserModuleMocker,
  BrowserProvider,
  BrowserProviderOption,
  TestProject,
} from "vitest/node";

type MockedModule = Parameters<BrowserModuleMocker["register"]>[1];

// The mock, whose factory's failure the project's logger prints, and which
// then resolves to no exports.
function withoutRejectedFactory(
  module: MockedModule,
  logger: TestProject["vitest"]["logger"],
): MockedModule {
  if (module.type !== "manual") {
    return module;
  }
  const resolve = module.resolve.bind(module);
  module.resolve = async (): Promise<unknown> => {
    try {
      return await resolve();
    } catch (error) {
      logger.error(
        `vi.mock("${module.raw}") failed to resolve, so its test file fails to import the mock. The mock's error:`,
      );
      logger.printError(error, { fullStack: true });
      return {};
    }
  };
  return module;
}

// Playwright's provider, for options, whose mocks never stop the run.
function playwrightProvider(
  options: PlaywrightProviderOptions = {},
): BrowserProviderOption<PlaywrightProviderOptions> {
  const provider = playwright(options);
  return {
    ...provider,
    providerFactory(project: TestProject): BrowserProvider {
      const instance = provider.providerFactory(project);
      const { mocker } = instance;
      if (mocker !== undefined) {
        instance.mocker = {
          ...mocker,
          register: (sessionId: string, module: MockedModule): Promise<void> =>
            mocker.register(
              sessionId,
              withoutRejectedFactory(module, project.vitest.logger),
            ),
        };
      }
      return instance;
    },
  };
}

export { playwrightProvider };
