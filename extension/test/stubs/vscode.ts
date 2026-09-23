/**
 * Minimal `vscode` stub for T1 unit tests.
 *
 * `01` §3 requires unit tests to run without the extension host; this stub
 * satisfies module resolution for the parts of the graph that import the editor
 * API (currently `infra/configSource`). It implements only what tests touch and
 * returns empty values so that a forgotten stub never silently *passes* a test.
 */

export const workspace = {
  getConfiguration: (): { get: <T>() => T | undefined } => ({
    get: <T,>(): T | undefined => undefined,
  }),
};

export const window = {
  showInformationMessage: async (): Promise<undefined> => undefined,
  showWarningMessage: async (): Promise<undefined> => undefined,
};

export const commands = {
  registerCommand: (): { dispose: () => void } => ({ dispose: () => undefined }),
};
