import * as vscode from 'vscode';

import { LocalFailure, readRawConfig } from '../infra';
import { normalizeConfig } from '../core';
import type { RiskEngine } from '../core';
import { revealRiskItem, showRiskList } from './riskList';
import { createStatusReporter } from './status';
import type { StatusReporter } from './status';

/** Command id, identical to `API-02` in the contract (`03` §2.2). */
const INSPECT_COMMAND = 'sonecheck.inspectDiff';

/**
 * Register the command surface.
 *
 * The UI layer only orchestrates: read raw settings → normalize → run the engine
 * → hand the result to the presentation layer. Every failure is caught here,
 * prompted **once** and swallowed, so a check can never block the user's commit
 * (`INV-01`).
 */
export function registerCommands(engine: RiskEngine): vscode.Disposable[] {
  const status = createStatusReporter();

  return [
    vscode.commands.registerCommand(INSPECT_COMMAND, () => runInspection(engine, status)),
    status,
  ];
}

async function runInspection(engine: RiskEngine, status: StatusReporter): Promise<void> {
  const config = normalizeConfig(readRawConfig());

  if (!config.enabled) {
    await status.notify('SoneCheck: 已在设置中关闭（sonecheck.enabled）');
    return;
  }

  status.set('running');

  try {
    const items = await engine.inspect(config, workspaceRoot());

    if (items.length === 0) {
      // Zero disturbance: a single transient status line, never a popup (US-03).
      status.set('clear');
      return;
    }

    status.set('idle');
    const picked = await showRiskList(items);

    if (picked !== undefined && !(await revealRiskItem(picked, workspaceRoot()))) {
      status.set('warning');
      await status.notify('SoneCheck: 该条目已无法定位（文件或行号已失效）', 'warn');
    }
  } catch (error) {
    await reportFailure(error, status);
  }
}

function workspaceRoot(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

/** One-shot prompt per failure; never re-thrown, never silent (`400-build` §3.5). */
async function reportFailure(error: unknown, status: StatusReporter): Promise<void> {
  if (error instanceof LocalFailure) {
    switch (error.code) {
      case 'ERR-07':
        status.set('empty');
        await status.notify('SoneCheck: 无暂存改动');
        return;
      case 'ERR-06':
        status.set('warning');
        await status.notify('SoneCheck: 当前工作区不是 git 仓库', 'warn');
        return;
      default:
        status.set('warning');
        await status.notify('SoneCheck: 未找到 git 可执行文件', 'warn');
        return;
    }
  }

  status.set('warning');
  await status.notify('SoneCheck: 检查已跳过（内部错误）', 'warn');
}
