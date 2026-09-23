import type * as vscode from 'vscode';

import { createRiskEngine } from './core';
import {
  createMockJevClient,
  readSourceLines,
  readStagedDiff,
  resolveRepoRoot,
} from './infra';
import { registerCommands } from './ui/commands';

/**
 * SoneCheck — extension entry point (assembly layer, `02` §2 `src/extension.ts`).
 *
 * The only job of this file is wiring: it binds the infra capabilities to the
 * core engine and registers the UI commands. `v0.1.1` swaps the decision client
 * here (from the local mock to the HTTP one) without touching any caller.
 */
export function activate(context: vscode.ExtensionContext): void {
  const engine = createRiskEngine({
    resolveRepoRoot,
    readStagedDiff,
    readSourceLines,
    createClient: createMockJevClient,
  });

  context.subscriptions.push(...registerCommands(engine));
}

export function deactivate(): void {
  // Nothing to dispose: every subscription is owned by the activation context.
}
