import { describe, expect, it } from 'vitest';
import { formatRiskItem, REASON_LABELS } from '../src/ui/riskList';
import type { RiskItem, ReasonCode } from '../src/infra';

const ALL_REASONS: ReasonCode[] = [
  'AUTH_BOUNDARY',
  'DATA_WRITE',
  'CONTRACT_BREAK',
  'ERROR_HANDLING',
  'STYLE_ONLY',
];

function itemOf(overrides: Partial<RiskItem> = {}): RiskItem {
  return { filePath: 'src/auth/login.ts', startLine: 12, score: 0.42, reasonCode: 'AUTH_BOUNDARY', ...overrides };
}

describe('formatRiskItem', () => {
  it('按 04 §1 的 `[score] 文件:行 · reason` 格式输出', () => {
    expect(formatRiskItem(itemOf())).toBe('[0.42] src/auth/login.ts:12 · 鉴权边界');
  });

  it('分数保留两位小数（与清单可读性一致）', () => {
    expect(formatRiskItem(itemOf({ score: 0.4 }))).toContain('[0.40]');
    expect(formatRiskItem(itemOf({ score: 1 }))).toContain('[1.00]');
  });

  it('五种生效的 reason_code 均有显示文案', () => {
    for (const reason of ALL_REASONS) {
      expect(REASON_LABELS[reason]).toBeTruthy();
      expect(formatRiskItem(itemOf({ reasonCode: reason }))).toContain(REASON_LABELS[reason]);
    }
  });
});
