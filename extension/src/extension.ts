import type * as vscode from 'vscode';

/**
 * SoneCheck — extension entry point (assembly layer, `02` §2 `src/extension.ts`).
 *
 * S0: shell only. This file owns dependency assembly and nothing else: the
 * command handler is registered by `src/ui/commands.ts` and wired in here from
 * S4 on (see `400-build.md` §3.5). No business logic may live in this file.
 */

export function activate(_context: vscode.ExtensionContext): void {
  // TODO(S4): _context.subscriptions.push(registerCommands())
}

export function deactivate(): void {
  // Nothing to dispose yet: all subscriptions are owned by the activation context.
}
