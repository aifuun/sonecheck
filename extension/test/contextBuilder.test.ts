import { describe, expect, it } from 'vitest';
import { buildContext } from '../src/core';
import { CONTEXT_WINDOW_LINES, MAX_PAYLOAD_BYTES } from '../src/constants';
import { serializePayload } from '../src/infra';
import type { Hunk, HunkPayload } from '../src/infra';

function hunkOf(startLine: number, diffContent = '@@ -1,1 +1,1 @@\n+changed'): Hunk {
  return { filePath: 'src/app.ts', startLine, changeType: 'MODIFY', diffContent };
}

const source = [
  'import { db } from "./db";',
  '',
  'export class UserService {',
  '  private cache = new Map();',
  '',
  '  async find(id) {',
  '    if (!id) return null;',
  '    const row = await db.get(id);',
  '    return row;',
  '  }',
  '}',
  '',
  'export const other = 1;',
];

describe('buildContext', () => {
  it('括号平衡时返回整个作用域', () => {
    const context = buildContext(hunkOf(9), source);

    expect(context).toContain('async find(id) {');
    expect(context).toContain('return row;');
    expect(context).not.toContain('import { db }');
    expect(context).not.toContain('export const other');
  });

  it('括号不平衡时退化为固定窗口且保留改动行', () => {
    const unbalanced = Array.from({ length: 60 }, (_, index) => `line ${index + 1}`);
    const context = buildContext(hunkOf(30), unbalanced);
    const lines = context.split('\n');

    expect(lines.length).toBeLessThanOrEqual(CONTEXT_WINDOW_LINES * 2 + 1);
    expect(context).toContain('line 30');
  });

  it('超出剩余预算时从尾部截断并保留改动行', () => {
    const longLines = Array.from({ length: 400 }, (_, index) => `const value${index + 1} = "${'x'.repeat(20)}";`);
    longLines[300] = '  const changedLine = 42;';
    const hunk = hunkOf(301);

    const context = buildContext(hunk, longLines);
    const payload: HunkPayload = {
      filePath: hunk.filePath,
      changeType: hunk.changeType,
      diffHunk: hunk.diffContent,
      contextCode: context,
    };

    expect(context).toContain('const changedLine = 42;');
    expect(Buffer.byteLength(serializePayload(payload), 'utf8')).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
    expect(context).not.toContain('const value400');
  });

  it('单行即超预算时按字节硬截断，payload 仍不越界（INV-02）', () => {
    const huge = `const blob = "${'y'.repeat(5000)}";`;
    const hunk = hunkOf(1);
    const context = buildContext(hunk, [huge]);
    const payload: HunkPayload = {
      filePath: hunk.filePath,
      changeType: hunk.changeType,
      diffHunk: hunk.diffContent,
      contextCode: context,
    };

    expect(Buffer.byteLength(serializePayload(payload), 'utf8')).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
  });

  it('多字节字符不被截断成替换字符', () => {
    const japanese = `const label = "${'漢字の罠'.repeat(200)}";`;
    const hunk = hunkOf(1);
    const context = buildContext(hunk, [japanese]);

    expect(context).not.toContain('\uFFFD');
  });

  it('空源文件返回空串', () => {
    expect(buildContext(hunkOf(1), [])).toBe('');
  });
});
