import { join } from 'node:path';
import * as vscode from 'vscode';

import type { RiskItem } from '../core';
import type { ReasonCode } from '../infra';

/**
 * Display copy of `reason_code` (`04` §1 is the copy SSOT).
 *
 * Kept next to the picker because it is pure presentation: the contract owns the
 * machine-readable value, this owns the human-readable one.
 */
export const REASON_LABELS: Record<ReasonCode, string> = {
  AUTH_BOUNDARY: '鉴权边界',
  DATA_WRITE: '数据写入',
  CONTRACT_BREAK: '契约破坏',
  ERROR_HANDLING: '错误处理',
  STYLE_ONLY: '样式改动',
};

/** Pick-list label: `[score] 文件:行 · reason` (`04` §1). */
export function formatRiskItem(item: RiskItem): string {
  return `[${item.score.toFixed(2)}] ${item.filePath}:${item.startLine} · ${REASON_LABELS[item.reasonCode]}`;
}

/**
 * Show the Top-K risk list.
 *
 * Returns the picked entry, or `undefined` when the user dismissed the picker
 * (which must leave the editor untouched — `04` §1 step 6).
 */
export async function showRiskList(items: RiskItem[]): Promise<RiskItem | undefined> {
  const picked = await vscode.window.showQuickPick(
    items.map((item) => ({ label: formatRiskItem(item), item })),
    { placeHolder: `SoneCheck：${items.length} 项改动待人工复核`, ignoreFocusOut: false },
  );

  return picked?.item;
}

/**
 * Open the target file and put the cursor on the hunk's first line.
 *
 * `INV-06`: entries reaching here are already known to be locatable; the return
 * value reports a late failure (file deleted between check and click) so the UI
 * can prompt once instead of failing silently.
 */
export async function revealRiskItem(item: RiskItem, rootDir: string): Promise<boolean> {
  try {
    const uri = vscode.Uri.file(join(rootDir, item.filePath));
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    const position = new vscode.Position(Math.max(0, item.startLine - 1), 0);

    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    return true;
  } catch {
    return false;
  }
}
