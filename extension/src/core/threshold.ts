import type { DecisionResult, Hunk, ReasonCode } from '../infra';
import type { SoneCheckConfig } from './config';

/** A hunk paired with its decision — the input of filtering. */
export interface ScoredHunk {
  hunk: Hunk;
  result: DecisionResult;
}

/**
 * Pick-list entry.
 *
 * `400-build` §1.1: every entry must be locatable (`INV-06`) — items whose file
 * or line cannot be resolved never reach the list.
 */
export interface RiskItem {
  filePath: string;
  startLine: number;
  score: number;
  reasonCode: ReasonCode;
}

/**
 * Filter, rank and truncate the scored hunks (`300-design` §3 step 10).
 *
 * - threshold semantics are `>=` (`400-build` §3.6: a score equal to the
 *   threshold is audited);
 * - ranking is stable: score desc, then `filePath` asc, then line asc;
 * - at most `config.maxItems` entries survive;
 * - non-locatable hunks are dropped here so the UI never shows a dead link.
 */
export function filterRisky(
  scored: ScoredHunk[],
  config: SoneCheckConfig,
  isLocatable: (hunk: Hunk) => boolean,
): RiskItem[] {
  return scored
    .filter(({ hunk, result }) => result.score >= config.riskThreshold && isLocatable(hunk))
    .map(({ hunk, result }) => ({
      filePath: hunk.filePath,
      startLine: hunk.startLine,
      score: result.score,
      reasonCode: result.reasonCode,
    }))
    .sort(compareRiskItems)
    .slice(0, Math.max(0, config.maxItems));
}

function compareRiskItems(left: RiskItem, right: RiskItem): number {
  if (right.score !== left.score) return right.score - left.score;
  if (left.filePath !== right.filePath) return left.filePath < right.filePath ? -1 : 1;
  return left.startLine - right.startLine;
}
