import { execFileSync } from 'node:child_process';

import { GIT_MAX_BUFFER } from '../constants';

/** Local failure codes of `API-02` (`03` §2.2) — classified, never silent. */
export type LocalFailureCode = 'ERR-06' | 'ERR-07' | 'ERR-09';

/**
 * A local, classified failure.
 *
 * `INV-01` requires every failure to end in "pass through": the UI catches this
 * type, prompts once and stops — it never blocks the commit and never surfaces
 * as an unclassified exception (see `400-build` §3.5).
 */
export class LocalFailure extends Error {
  readonly code: LocalFailureCode;

  constructor(code: LocalFailureCode, message: string) {
    super(message);
    this.name = 'LocalFailure';
    this.code = code;
  }
}

/**
 * Absolute path of the repository root, or `ERR-06` / `ERR-09`.
 *
 * Read-only: only `rev-parse` is executed.
 */
export function resolveRepoRoot(cwd: string): string {
  return run(['rev-parse', '--show-toplevel'], cwd).trim();
}

/**
 * Raw text of `git diff --staged` (read-only).
 *
 * An empty string means "no staged changes"; `ERR-07` is raised by the caller
 * that owns the command contract (`core/riskEngine`), so this function stays a
 * pure read.
 */
export function readStagedDiff(cwd: string): string {
  return run(['diff', '--staged', '--no-color'], cwd);
}

function run(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: GIT_MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw classify(error, cwd);
  }
}

/**
 * Map a git failure to a contract error code.
 *
 * `spawn ENOENT` means the executable is missing (ERR-09); "not a git
 * repository" is ERR-06. Everything else (oversized diff, unusable cwd …) is
 * re-thrown unchanged so the UI reports it once as an unknown failure
 * (`400-build` §3.5) instead of mislabelling it.
 */
function classify(error: unknown, cwd: string): Error {
  const message = `${(error as Error).message ?? ''} ${String(
    (error as { stderr?: string }).stderr ?? '',
  )}`;

  if (/ENOENT/.test(message)) {
    return new LocalFailure('ERR-09', 'git executable not found');
  }
  if (/not a git repository/i.test(message)) {
    return new LocalFailure('ERR-06', `not a git repository: ${cwd}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}
