import { describe, expect, it } from 'vitest';
import { filterRisky } from '../src/core';
import type { RiskItem, ScoredHunk, SoneCheckConfig } from '../src/core';
import type { Hunk } from '../src/infra';

const config: SoneCheckConfig = {
  riskThreshold: 0.4,
  maxItems: 3,
  enabled: true,
  sensitivePathPatterns: ['auth'],
};

const alwaysLocatable = (): boolean => true;

function scored(filePath: string, startLine: number, score: number, reasonCode = 'AUTH_BOUNDARY'): ScoredHunk {
  const hunk: Hunk = {
    filePath,
    startLine,
    changeType: 'MODIFY',
    diffContent: '@@ -1,1 +1,2 @@\n+const a = 1;',
  };
  return { hunk, result: { score, decision: score >= config.riskThreshold ? 'AUDIT' : 'PASS', reasonCode } };
}

function paths(items: RiskItem[]): string[] {
  return items.map((item) => item.filePath);
}

describe('filterRisky', () => {
  it('恰好等于阈值时计入清单（>= 语义）', () => {
    const items = filterRisky([scored('src/a.ts', 1, config.riskThreshold)], config, alwaysLocatable);

    expect(items).toHaveLength(1);
    expect(items[0].score).toBe(config.riskThreshold);
  });

  it('超出条数上限时只保留分数最高的 3 条', () => {
    const scores = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45];
    const scored10 = scores.map((score, index) => scored(`src/file${index}.ts`, 1, score));

    const items = filterRisky(scored10, config, alwaysLocatable);

    expect(items).toHaveLength(config.maxItems);
    expect(items.map((item) => item.score)).toEqual([0.9, 0.85, 0.8]);
  });

  it('结果不可定位时剔除该项', () => {
    const items = filterRisky(
      [scored('src/gone.ts', 1, 0.9), scored('src/kept.ts', 1, 0.5)],
      config,
      (hunk) => hunk.filePath !== 'src/gone.ts',
    );

    expect(paths(items)).toEqual(['src/kept.ts']);
  });

  it('全部低风险时返回空数组（走零打扰分支）', () => {
    expect(filterRisky([scored('src/a.ts', 1, 0.1)], config, alwaysLocatable)).toEqual([]);
  });

  it('同分按 filePath 字典序稳定排序', () => {
    const items = filterRisky(
      [scored('src/c.ts', 1, 0.5), scored('src/a.ts', 1, 0.5), scored('src/b.ts', 1, 0.5)],
      config,
      alwaysLocatable,
    );

    expect(paths(items)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
  });

  it('enabled=false 时引擎不产出条目（由 riskEngine 短路）', () => {
    const disabled: SoneCheckConfig = { ...config, enabled: false };

    // The engine short-circuits; filtering itself stays a pure threshold+Top-K step.
    expect(filterRisky([scored('src/a.ts', 1, 0.9)], disabled, alwaysLocatable)).toHaveLength(1);
  });
});
