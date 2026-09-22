import * as vscode from 'vscode';

import { LocalFailure, readRawConfig } from '../infra';
import { normalizeConfig } from '../core';
import type { RiskEngine } from '../core';

/** Command id, identical to `API-02` in the contract (`03` §2.2). */
const INSPECT_COMMAND = 'sonecheck.inspectDiff';

/**
 * Register the command surface.
 *
 * The UI layer only orchestrates: read raw settings → normalize → run the
 * engine → hand the result to the presentation layer. Every failure is caught
 * here, prompted **once** and swallowed, so a check can never block the user's
 * commit (`INV-01`).
 */
export function registerCommands(engine: RiskEngine): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(INSPECT_COMMAND, () => runInspection(engine)),
  ];
}

async function runInspection(engine: RiskEngine): Promise<void> {
  try {
    const config = normalizeConfig(readRawConfig());
    const items = await engine.inspect(config, workspaceRoot());
    // TODO(S5): hand over to `ui/riskList` (QuickPick + jump) and `ui/status`.
    await vscode.window.showInformationMessage(`SoneCheck: ${items.length} 项待人工复核`);
  } catch (error) {
    await reportOnce(error);
  }
}

function workspaceRoot(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

/** One-shot prompt per failure; never re-thrown, never silent (`400-build` §3.5). */
async function reportOnce(error: unknown): Promise<void> {
  if (error instanceof LocalFailure) {
    const message =
      error.code === 'ERR-06'
        ? 'SoneCheck: 当前工作区不是 git 仓库'
        : error.code === 'ERR-07'
          ? 'SoneCheck: 无暂存改动'
          : 'SoneCheck: 未找到 git 可执行文件';

    if (error.code === 'ERR-07') await vscode.window.showInformationMessage(message);
    else await vscode.window.showWarningMessage(message);
    return;
  }

  await vscode.window.showWarningMessage('SoneCheck: 检查已跳过（内部错误）');
}
