import {
  SCALE_CAP_LINES,
  WEIGHT_EXPORT,
  WEIGHT_KEYWORD,
  WEIGHT_SCALE,
  WEIGHT_SENSITIVE_PATH,
} from '../constants';

/**
 * Jev decision client — the only outbound boundary of the extension
 * (`API-01`, `02` §2 `infra/jevClient`).
 *
 * S1 froze the public surface; `v0.1.1` swaps the local mock for the real HTTP
 * client without touching callers (ADR-002). Wire format mapping
 * (camelCase → snake_case) and error-code normalization belong to this module.
 *
 * `v0.1.0` implementation: pure function, no network, no API key.
 */

/** Change kind of a hunk; serializes to `change_type` (`03` §2.1 Request). */
export type ChangeType = 'MODIFY' | 'ADD' | 'DELETE';

/**
 * Outbound payload for a single hunk (`API-01` Request).
 *
 * Precondition: the serialized payload total length must not exceed
 * `MAX_PAYLOAD_BYTES`; the caller (`core/contextBuilder`) guarantees it.
 */
export interface HunkPayload {
  /** Repository-relative path (`file_path` on the wire). */
  filePath: string;
  /** Change kind (`change_type` on the wire). */
  changeType: ChangeType;
  /** Added/removed lines of this hunk (`diff_hunk` on the wire). */
  diffHunk: string;
  /** Bounded scope context (`context_code` on the wire). */
  contextCode: string;
}

/**
 * `reason_code` values delivered by this version (`03` §2.4).
 *
 * One value per hunk; the enum is a closed set — a value outside it is treated
 * as a schema violation (dropped, `ERR-05`).
 */
export type ReasonCode =
  | 'AUTH_BOUNDARY'
  | 'DATA_WRITE'
  | 'CONTRACT_BREAK'
  | 'ERROR_HANDLING'
  | 'STYLE_ONLY';

/**
 * Decision result consumed by `core/riskEngine`.
 *
 * `score` is a continuous probability in `[0, 1]`; `decision` is derived
 * locally from `score` and the configured threshold — it is never returned by
 * the upstream service.
 */
export interface DecisionResult {
  score: number;
  decision: 'AUDIT' | 'PASS';
  reasonCode: ReasonCode;
}

/**
 * Frozen decision-service abstraction.
 *
 * Invariants (shared by the `v0.1.0` mock and the `v0.1.1` real client):
 * - same input yields the same output (idempotent);
 * - a failure never throws business errors upward — the caller degrades;
 * - the signature and `DecisionResult` fields do not change between versions.
 */
export interface IJevClient {
  decide(payload: HunkPayload): Promise<DecisionResult>;
}

/**
 * The part of the normalized configuration the decision call needs.
 *
 * Declared here (not imported from `core`) to keep the layer direction intact:
 * infra must not depend on upper layers. `SoneCheckConfig` satisfies it
 * structurally.
 */
export interface DecisionPolicy {
  /** `CFG-01` `sensitivePathPatterns`: substrings matched against the file path. */
  sensitivePathPatterns: string[];
  /** `CFG-01` `riskThreshold`: boundary between `AUDIT` and `PASS`. */
  riskThreshold: number;
}

/** Input of the mock scorer (`400-build` §3.3). */
export interface ScoreInput {
  payload: HunkPayload;
  policy: DecisionPolicy;
}

/** Keyword lexicon of the mock scorer, with the attribution each group implies. */
const KEYWORD_RULES: ReadonlyArray<{ keyword: string; code: Exclude<ReasonCode, 'STYLE_ONLY'> }> = [
  { keyword: 'auth', code: 'AUTH_BOUNDARY' },
  { keyword: 'token', code: 'AUTH_BOUNDARY' },
  { keyword: 'password', code: 'AUTH_BOUNDARY' },
  { keyword: 'session', code: 'AUTH_BOUNDARY' },
  { keyword: 'delete', code: 'DATA_WRITE' },
  { keyword: 'transaction', code: 'DATA_WRITE' },
  { keyword: 'catch', code: 'ERROR_HANDLING' },
];

/**
 * Score one hunk (mock of the System-1 decision call).
 *
 * Four dimensions are combined with fixed weights (`300-design` §4.2):
 * sensitive path, keyword pattern, change size, exported symbol. The result is
 * truncated into `[0, 1]` and compared against `policy.riskThreshold`.
 *
 * Attribution: the highest-weighted *semantic* dimension decides `reasonCode`
 * (change size only contributes to the score). A hunk without any changed line
 * is a pure style case and always returns `STYLE_ONLY` / `PASS`.
 */
export function scoreHunk(input: ScoreInput): DecisionResult {
  const { payload, policy } = input;
  const changedLines = changedLinesOf(payload.diffHunk);

  if (changedLines.length === 0) {
    return { score: 0, decision: 'PASS', reasonCode: 'STYLE_ONLY' };
  }

  const sensitive = matchesSensitivePath(payload.filePath, policy.sensitivePathPatterns) ? 1 : 0;
  const keyword = keywordMatch(changedLines);
  const scale = Math.min(1, changedLines.length / SCALE_CAP_LINES);
  const exported = changedLines.some(isExportDeclaration) ? 1 : 0;

  const score = clamp01(
    sensitive * WEIGHT_SENSITIVE_PATH +
      keyword.ratio * WEIGHT_KEYWORD +
      scale * WEIGHT_SCALE +
      exported * WEIGHT_EXPORT,
  );

  return {
    score,
    decision: score >= policy.riskThreshold ? 'AUDIT' : 'PASS',
    reasonCode: attributeReason(sensitive, exported, keyword),
  };
}

/**
 * Create the `v0.1.0` client: a local, network-free implementation bound to the
 * configuration of one inspection. The assembly layer injects the factory, tests
 * inject an in-memory stub (`01` §3 T1 mock discipline).
 */
export function createMockJevClient(policy: DecisionPolicy): IJevClient {
  return {
    decide: async (payload: HunkPayload): Promise<DecisionResult> => scoreHunk({ payload, policy }),
  };
}

/**
 * Serialize a payload exactly as `API-01` Request expects it (snake_case keys).
 *
 * Owned here because this module owns the wire format: the same mapping is used
 * by the `v0.1.1` HTTP client, and it is the single source for measuring the
 * `INV-02` bound.
 */
export function serializePayload(payload: HunkPayload): string {
  return JSON.stringify({
    file_path: payload.filePath,
    change_type: payload.changeType,
    diff_hunk: payload.diffHunk,
    context_code: payload.contextCode,
  });
}

/** Wire length of a JSON string value: its escaped bytes, quotes excluded. */
export function wireBytes(value: string): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8') - 2;
}

/**
 * Wire cost of one line break inside a JSON string: the raw newline byte plus
 * the backslash of its escape. Multi-line fields are measured additively with
 * this constant (`wire(a + "\n" + b) === wire(a) + WIRE_LINE_SEPARATOR_BYTES + wire(b)`).
 */
export const WIRE_LINE_SEPARATOR_BYTES = 2;

/**
 * Truncate `value` to `budget` wire bytes without splitting a code point.
 * Binary search keeps the result exact even when escaping inflates it.
 */
export function truncateToWireBytes(value: string, budget: number): string {
  if (budget <= 0) return '';

  const chars = Array.from(value);
  let low = 0;
  let high = chars.length;
  let best = 0;

  while (low <= high) {
    const middle = (low + high) >> 1;
    if (wireBytes(chars.slice(0, middle).join('')) <= budget) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return chars.slice(0, best).join('');
}

/** Added/removed lines of the hunk, ignoring the `+++` / `---` file headers. */
function changedLinesOf(diffHunk: string): string[] {
  return diffHunk
    .split('\n')
    .filter((line) => (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---'));
}

function matchesSensitivePath(filePath: string, patterns: string[]): boolean {
  const target = filePath.toLowerCase();
  return patterns.some((pattern) => pattern.length > 0 && target.includes(pattern.toLowerCase()));
}

function keywordMatch(
  changedLines: string[],
): { ratio: number; code: Exclude<ReasonCode, 'STYLE_ONLY'> | null } {
  const haystack = changedLines.join('\n').toLowerCase();
  const hits = KEYWORD_RULES.filter((rule) => haystack.includes(rule.keyword));

  if (hits.length === 0) return { ratio: 0, code: null };
  // Priority follows the lexicon order: auth boundary before data write before error handling.
  return { ratio: Math.min(1, hits.length / KEYWORD_RULES.length), code: hits[0].code };
}

function isExportDeclaration(line: string): boolean {
  return /^[+-]\s*(export|public)\b/.test(line);
}

/**
 * Pick the `reason_code` of the highest-weighted semantic dimension.
 * Change size is intentionally excluded: it says nothing about *what* changed.
 */
function attributeReason(
  sensitive: number,
  exported: number,
  keyword: { ratio: number; code: Exclude<ReasonCode, 'STYLE_ONLY'> | null },
): ReasonCode {
  if (sensitive > 0) return 'AUTH_BOUNDARY';
  if (exported > 0) return 'CONTRACT_BREAK';
  if (keyword.ratio > 0 && keyword.code !== null) return keyword.code;
  return 'STYLE_ONLY';
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
