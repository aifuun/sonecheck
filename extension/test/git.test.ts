import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalFailure, readSourceLines, readStagedDiff, resolveRepoRoot } from '../src/infra';

const created: string[] = [];

function createRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sonecheck-'));
  created.push(dir);
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'SoneCheck Test'], { cwd: dir });
  writeFileSync(join(dir, 'app.ts'), 'export const value = 1;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  return dir;
}

afterEach(() => {
  while (created.length > 0) {
    rmSync(created.pop() as string, { recursive: true, force: true });
  }
});

describe('infra/git', () => {
  it('解析仓库根与暂存 diff', () => {
    const dir = createRepo();
    const root = resolveRepoRoot(dir);

    expect(root.startsWith('/')).toBe(true);
    expect(root.endsWith(basename(dir))).toBe(true);
    expect(readStagedDiff(dir)).toContain('app.ts');
  });

  it('调用前后工作区状态完全一致（INV-05 只读）', () => {
    const dir = createRepo();
    const before = execFileSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' });

    readStagedDiff(dir);

    const after = execFileSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' });
    expect(after).toBe(before);
  });

  it('无暂存改动时返回空串', () => {
    const dir = createRepo();
    execFileSync('git', ['commit', '-qm', 'init'], { cwd: dir });

    expect(readStagedDiff(dir)).toBe('');
  });

  it('非 git 目录抛出分类失败 ERR-06', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sonecheck-plain-'));
    created.push(dir);

    try {
      resolveRepoRoot(dir);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(LocalFailure);
      expect((error as LocalFailure).code).toBe('ERR-06');
    }
  });

  it('源文件缺失时返回空数组而不抛错', () => {
    const dir = createRepo();

    expect(readSourceLines(dir, 'missing.ts')).toEqual([]);
    expect(readSourceLines(dir, 'app.ts')).toHaveLength(2);
  });
});
