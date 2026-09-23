import { LocalFailure, parseDiff } from '../infra';
import type { DecisionPolicy, Hunk, IJevClient, HunkPayload } from '../infra';

import { buildContext } from './contextBuilder';
import type { SoneCheckConfig } from './config';
import { filterRisky } from './threshold';
import type { RiskItem, ScoredHunk } from './threshold';

/**
 * IO capabilities the engine needs, injected by the assembly layer
 * (`02` §2「判定服务抽象」 + `400-build` §3.5 step 6). Pure functions
 * (`parseDiff` / `buildContext` / `filterRisky`) are imported directly — they
 * need no substitution.
 */
export interface RiskEngineDeps {
  resolveRepoRoot(cwd: string): string;
  readStagedDiff(cwd: string): string;
  readSourceLines(repoRoot: string, filePath: string): string[];
  /** Builds the decision client for one inspection (`v0.1.1` injects the HTTP one). */
  createClient(policy: DecisionPolicy): IJevClient;
}

/** The version's main pipeline (`300-design` §3). */
export interface RiskEngine {
  /**
   * Run one full inspection.
   *
   * Always resolves to `RiskItem[]` (possibly empty) and never throws an
   * unclassified error: local failures (`ERR-06` / `ERR-07` / `ERR-09`) are
   * raised as {@link LocalFailure} so the UI can prompt once and pass through
   * (`INV-01`).
   */
  inspect(config: SoneCheckConfig, cwd: string): Promise<RiskItem[]>;
}

export function createRiskEngine(deps: RiskEngineDeps): RiskEngine {
  return {
    inspect: async (config: SoneCheckConfig, cwd: string): Promise<RiskItem[]> => {
      if (!config.enabled) return [];

      const repoRoot = deps.resolveRepoRoot(cwd);
      const hunks = parseDiff(deps.readStagedDiff(repoRoot));

      if (hunks.length === 0) {
        throw new LocalFailure('ERR-07', 'no staged changes');
      }

      const policy: DecisionPolicy = {
        sensitivePathPatterns: config.sensitivePathPatterns,
        riskThreshold: config.riskThreshold,
      };
      const client = deps.createClient(policy);
      const sourceCache = new Map<string, string[]>();
      const readLines = (filePath: string): string[] => {
        const cached = sourceCache.get(filePath);
        if (cached !== undefined) return cached;
        const lines = deps.readSourceLines(repoRoot, filePath);
        sourceCache.set(filePath, lines);
        return lines;
      };

      const scored: ScoredHunk[] = [];
      // Sequential on purpose: concurrency belongs to v0.1.1 (`400-build` §1.3).
      for (const hunk of hunks) {
        scored.push({ hunk, result: await client.decide(toPayload(hunk, readLines)) });
      }

      return filterRisky(
        scored,
        config,
        (hunk: Hunk) => isLocatable(hunk, readLines(hunk.filePath)),
      );
    },
  };
}

function toPayload(hunk: Hunk, readLines: (filePath: string) => string[]): HunkPayload {
  return {
    filePath: hunk.filePath,
    changeType: hunk.changeType,
    diffHunk: hunk.diffContent,
    contextCode: buildContext(hunk, readLines(hunk.filePath)),
  };
}

/** `INV-06`: the file exists and the hunk's first line is inside it. */
function isLocatable(hunk: Hunk, lines: string[]): boolean {
  return lines.length > 0 && hunk.startLine >= 1 && hunk.startLine <= lines.length;
}
