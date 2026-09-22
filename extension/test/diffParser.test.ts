import { describe, expect, it } from 'vitest';
import { parseDiff, wireBytes } from '../src/infra';
import { HUNK_METADATA_RESERVE_BYTES, MAX_PAYLOAD_BYTES } from '../src/constants';

/** Same bound the parser must respect so that one hunk fits one payload (`INV-02`). */
const MAX_DIFF_WIRE_BYTES = MAX_PAYLOAD_BYTES - HUNK_METADATA_RESERVE_BYTES;

const modifyDiff = [
  'diff --git a/src/auth/login.ts b/src/auth/login.ts',
  'index 1111111..2222222 100644',
  '--- a/src/auth/login.ts',
  '+++ b/src/auth/login.ts',
  '@@ -10,7 +10,8 @@ export function login() {',
  '   const token = issue();',
  '-  const ttl = 60;',
  '+  const ttl = 30;',
  '+  audit(token);',
  ' }',
].join('\n');

const addDiff = [
  'diff --git a/src/new.ts b/src/new.ts',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/src/new.ts',
  '@@ -0,0 +1,2 @@',
  '+export const added = 1;',
  '+export const also = 2;',
].join('\n');

const deleteDiff = [
  'diff --git a/src/old.ts b/src/old.ts',
  'deleted file mode 100644',
  '--- a/src/old.ts',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  '-export const gone = 1;',
  '-export const alsoGone = 2;',
].join('\n');

const renameDiff = [
  'diff --git a/src/before.ts b/src/after.ts',
  'similarity index 90%',
  'rename from src/before.ts',
  'rename to src/after.ts',
  '--- a/src/before.ts',
  '+++ b/src/after.ts',
  '@@ -1,3 +1,3 @@',
  ' export const kept = 1;',
  '-export const renamed = 2;',
  '+export const renamed = 3;',
].join('\n');

const binaryDiff = [
  'diff --git a/assets/logo.png b/assets/logo.png',
  'index 3333333..4444444 100644',
  'Binary files a/assets/logo.png and b/assets/logo.png differ',
].join('\n');

describe('parseDiff', () => {
  it('空输入返回空数组而不抛错', () => {
    expect(parseDiff('')).toEqual([]);
  });

  it('解析单文件多 hunk 并记录新文件起始行', () => {
    const hunks = parseDiff(modifyDiff);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].filePath).toBe('src/auth/login.ts');
    expect(hunks[0].startLine).toBe(10);
    expect(hunks[0].changeType).toBe('MODIFY');
    expect(hunks[0].diffContent).toContain('+  const ttl = 30;');
  });

  it('多文件 diff 按文件切分', () => {
    const hunks = parseDiff(`${modifyDiff}\n${addDiff}`);

    expect(hunks.map((hunk) => hunk.filePath)).toEqual(['src/auth/login.ts', 'src/new.ts']);
  });

  it('新增文件识别为 ADD 且起始行为 1', () => {
    const [hunk] = parseDiff(addDiff);

    expect(hunk.changeType).toBe('ADD');
    expect(hunk.filePath).toBe('src/new.ts');
    expect(hunk.startLine).toBe(1);
  });

  it('删除文件识别为 DELETE 并从 diff --git 行取路径', () => {
    const [hunk] = parseDiff(deleteDiff);

    expect(hunk.changeType).toBe('DELETE');
    expect(hunk.filePath).toBe('src/old.ts');
    expect(hunk.startLine).toBe(1);
  });

  it('重命名识别为新路径的 MODIFY', () => {
    const [hunk] = parseDiff(renameDiff);

    expect(hunk.changeType).toBe('MODIFY');
    expect(hunk.filePath).toBe('src/after.ts');
  });

  it('二进制文件被跳过', () => {
    expect(parseDiff(binaryDiff)).toEqual([]);
  });

  it('二进制与文本混合时只保留文本 hunk', () => {
    const hunks = parseDiff(`${binaryDiff}\n${modifyDiff}`);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].filePath).toBe('src/auth/login.ts');
  });

  it('超长 hunk 按 payload 上限切分，且改动行与起始行全部保留', () => {
    const body = Array.from(
      { length: 120 },
      (_, index) => `+const value${index + 1} = "payload payload payload payload";`,
    );
    const diff = [
      'diff --git a/src/big.ts b/src/big.ts',
      '--- a/src/big.ts',
      '+++ b/src/big.ts',
      '@@ -0,0 +1,120 @@',
      ...body,
    ].join('\n');

    const hunks = parseDiff(diff);

    expect(hunks.length).toBeGreaterThan(1);
    for (const hunk of hunks) {
      expect(wireBytes(hunk.diffContent)).toBeLessThanOrEqual(MAX_DIFF_WIRE_BYTES);
    }

    const startLines = hunks.map((hunk) => hunk.startLine);
    expect([...startLines].sort((a, b) => a - b)).toEqual(startLines);

    const changed = hunks.flatMap((hunk) =>
      hunk.diffContent.split('\n').filter((line) => line.startsWith('+')),
    );
    expect(changed).toHaveLength(120);
    expect(changed[0]).toContain('value1');
    expect(changed[119]).toContain('value120');
  });

  it('单行即超限时截断该行，diff 仍不越界', () => {
    const diff = [
      'diff --git a/src/minified.js b/src/minified.js',
      '--- a/src/minified.js',
      '+++ b/src/minified.js',
      '@@ -1,1 +1,1 @@',
      `+const blob = "${'z'.repeat(4000)}";`,
    ].join('\n');

    const hunks = parseDiff(diff);

    expect(hunks).toHaveLength(1);
    expect(wireBytes(hunks[0].diffContent)).toBeLessThanOrEqual(MAX_DIFF_WIRE_BYTES);
  });

  it('CRLF 与 "\\ No newline at end of file" 容错', () => {
    const crlf = [
      'diff --git a/src/a.ts b/src/a.ts\r',
      '--- a/src/a.ts\r',
      '+++ b/src/a.ts\r',
      '@@ -1,1 +1,2 @@\r',
      ' const a = 1;\r',
      '+const b = 2;\r',
      '\\ No newline at end of file\r',
    ].join('\n');
    const hunks = parseDiff(crlf);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].diffContent).not.toContain('No newline');
    expect(hunks[0].diffContent).toContain('+const b = 2;');
  });
});
