/**
 * S2 measurement harness (`400-build` §3.3 step 4).
 *
 * Runs the pure core over two data sources — this project's own git history and
 * a set of constructed samples — and prints the distributions S3 needs to fix
 * `riskThreshold` / context window / payload cap (`dev-meta/docs/02-version-rules.md` §6.3).
 *
 * Dev-only, one-shot script: not part of the packaged extension, and never
 * imported by `src/`. Run with `npx tsx harness/measure.ts`.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import { MAX_PAYLOAD_BYTES, RISK_THRESHOLD } from '../src/constants';
import { buildContext } from '../src/core';
import { parseDiff, scoreHunk } from '../src/infra';
import type { DecisionPolicy, Hunk, HunkPayload } from '../src/infra';

const REPO_ROOT = resolve(dirname(__filename ?? '.'), '..', '..');

const POLICY: DecisionPolicy = {
  sensitivePathPatterns: ['auth', 'payment', 'migration'],
  riskThreshold: RISK_THRESHOLD,
};

const HISTORY_COMMITS = 40;
const THRESHOLD_SWEEP = [0.5, 0.6, 0.7, 0.8, 0.9];

interface Sample {
  source: 'history' | 'constructed';
  hunk: Hunk;
  /** `true` when the real file content was available for context building. */
  usedSourceFile: boolean;
}

function out(line = ''): void {
  process.stdout.write(`${line}\n`);
}

function readHistoryDiff(): string {
  try {
    return execFileSync('git', ['log', '-p', '--no-merges', `-n${HISTORY_COMMITS}`, '--format='], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    out(`history 读取失败：${(error as Error).message}`);
    return '';
  }
}

const CONSTRUCTED_DIFFS: ReadonlyArray<{ name: string; diff: string }> = [
  {
    name: 'auth 边界（token 校验）',
    diff: [
      'diff --git a/src/auth/token.ts b/src/auth/token.ts',
      '--- a/src/auth/token.ts',
      '+++ b/src/auth/token.ts',
      '@@ -12,7 +12,9 @@ export function verify(token: string) {',
      '   const secret = loadSecret();',
      '-  return jwt.verify(token, secret);',
      '+  if (!token) return null;',
      '+  return jwt.verify(token, secret);',
      ' }',
    ].join('\n'),
  },
  {
    name: '数据写入（事务边界）',
    diff: [
      'diff --git a/src/billing/payment-store.ts b/src/billing/payment-store.ts',
      '--- a/src/billing/payment-store.ts',
      '+++ b/src/billing/payment-store.ts',
      '@@ -30,6 +30,7 @@ export async function settle(order) {',
      '   await db.transaction(async (tx) => {',
      '+    await tx.update("orders", order.id, { paid: true });',
      '     return order;',
      '   });',
    ].join('\n'),
  },
  {
    name: '契约破坏（导出签名）',
    diff: [
      'diff --git a/src/api/client.ts b/src/api/client.ts',
      '--- a/src/api/client.ts',
      '+++ b/src/api/client.ts',
      '@@ -1,4 +1,4 @@',
      '-export function request(url: string): Promise<Response>',
      '+export function request(url: string, retries: number): Promise<Response>',
    ].join('\n'),
  },
  {
    name: '错误处理（吞掉异常）',
    diff: [
      'diff --git a/src/worker/job.ts b/src/worker/job.ts',
      '--- a/src/worker/job.ts',
      '+++ b/src/worker/job.ts',
      '@@ -20,6 +20,7 @@ export async function run(job) {',
      '   try {',
      '     await job.execute();',
      '+  } catch (error) {}',
      ' }',
    ].join('\n'),
  },
  {
    name: '纯样式（引号与空行）',
    diff: [
      'diff --git a/src/util/format.ts b/src/util/format.ts',
      '--- a/src/util/format.ts',
      '+++ b/src/util/format.ts',
      '@@ -5,3 +5,3 @@',
      "-const sep = ':'",
      '+const sep = ":"',
    ].join('\n'),
  },
  {
    name: 'migration（建表语句）',
    diff: [
      'diff --git a/db/migration/001_init.sql b/db/migration/001_init.sql',
      '--- a/db/migration/001_init.sql',
      '+++ b/db/migration/001_init.sql',
      '@@ -1,2 +1,3 @@',
      ' CREATE TABLE users (id INTEGER);',
      '+DROP TABLE legacy_users;',
    ].join('\n'),
  },
];

function collectSamples(): Sample[] {
  const samples: Sample[] = [];

  for (const hunk of parseDiff(readHistoryDiff())) {
    samples.push({ source: 'history', hunk, usedSourceFile: true });
  }

  for (const entry of CONSTRUCTED_DIFFS) {
    for (const hunk of parseDiff(entry.diff)) {
      samples.push({ source: 'constructed', hunk, usedSourceFile: false });
    }
  }

  return samples;
}

function sourceLinesFor(hunk: Hunk): { lines: string[]; fromFile: boolean } {
  const absolute = isAbsolute(hunk.filePath) ? hunk.filePath : join(REPO_ROOT, hunk.filePath);
  try {
    const lines = readFileSync(absolute, 'utf8').split(/\r?\n/);
    return { lines, fromFile: true };
  } catch {
    // Historical or deleted file: fall back to the hunk's own lines so that the
    // context pipeline is still exercised.
    return { lines: hunk.diffContent.split('\n'), fromFile: false };
  }
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index];
}

function buildPayload(sample: Sample): { payload: HunkPayload; fromFile: boolean } {
  const { lines, fromFile } = sourceLinesFor(sample.hunk);
  return {
    payload: {
      filePath: sample.hunk.filePath,
      changeType: sample.hunk.changeType,
      diffHunk: sample.hunk.diffContent,
      contextCode: buildContext(sample.hunk, lines),
    },
    fromFile,
  };
}

function main(): void {
  const samples = collectSamples();
  const historyCount = samples.filter((sample) => sample.source === 'history').length;

  out('# S2 Harness 实测数据');
  out();
  out(`- 样本来源：本项目 git 历史（最近 ${HISTORY_COMMITS} 个提交，${historyCount} 个 hunk）+ 构造样本（${samples.length - historyCount} 个 hunk）`);
  out(`- 权重与阈值：阈值 ${POLICY.riskThreshold}，敏感路径 ${POLICY.sensitivePathPatterns.join(' / ')}`);
  out();

  if (samples.length === 0) {
    out('无样本，无法给出分布。');
    return;
  }

  const scores: number[] = [];
  const contextBytes: number[] = [];
  const reasonCounts = new Map<string, number>();
  let overflow = 0;
  let fallbackSources = 0;

  for (const sample of samples) {
    const { payload, fromFile } = buildPayload(sample);
    if (!fromFile) fallbackSources += 1;

    const result = scoreHunk({ payload, policy: POLICY });
    scores.push(result.score);
    contextBytes.push(Buffer.byteLength(payload.contextCode, 'utf8'));
    reasonCounts.set(result.reasonCode, (reasonCounts.get(result.reasonCode) ?? 0) + 1);

    const wire = JSON.stringify({
      file_path: payload.filePath,
      change_type: payload.changeType,
      diff_hunk: payload.diffHunk,
      context_code: payload.contextCode,
    });
    if (Buffer.byteLength(wire, 'utf8') > MAX_PAYLOAD_BYTES) overflow += 1;
  }

  scores.sort((a, b) => a - b);
  contextBytes.sort((a, b) => a - b);

  out('## score 分布');
  out();
  out(`- min ${scores[0].toFixed(3)} · p50 ${percentile(scores, 0.5).toFixed(3)} · p90 ${percentile(scores, 0.9).toFixed(3)} · max ${scores[scores.length - 1].toFixed(3)}`);
  out();
  out('| 区间 | hunk 数 |');
  out('|---|---|');
  for (let bucket = 0; bucket < 10; bucket += 1) {
    const low = bucket / 10;
    const high = low + 0.1;
    const count = scores.filter((score) => score >= low && (bucket === 9 ? score <= high : score < high)).length;
    out(`| ${low.toFixed(1)}–${high.toFixed(1)} | ${count} |`);
  }
  out();

  out('## context_code 字节数分布');
  out();
  out(`- min ${contextBytes[0]} · p50 ${percentile(contextBytes, 0.5)} · p90 ${percentile(contextBytes, 0.9)} · max ${contextBytes[contextBytes.length - 1]}`);
  out();

  out('## reason_code 归因分布');
  out();
  out('| reason_code | hunk 数 |');
  out('|---|---|');
  for (const [reason, count] of [...reasonCounts.entries()].sort()) {
    out(`| ${reason} | ${count} |`);
  }
  out();

  out('## 阈值敏感性（AUDIT 命中数）');
  out();
  out(`| 阈值 | AUDIT 数 | 占样本比 |`);
  out('|---|---|---|');
  for (const threshold of THRESHOLD_SWEEP) {
    const hits = scores.filter((score) => score >= threshold).length;
    out(`| ${threshold.toFixed(1)} | ${hits} | ${((hits / scores.length) * 100).toFixed(1)}% |`);
  }
  out();

  out('## 边界检查');
  out();
  out(`- payload 超出 INV-02 上限的 hunk 数：${overflow}`);
  out(`- 历史文件缺失、改用 hunk 自身行做上下文的样本数：${fallbackSources}`);

  if (overflow > 0) {
    process.exitCode = 1;
    out();
    out('❌ INV-02 被突破，S3 定案前必须修复。');
  }
}

main();
