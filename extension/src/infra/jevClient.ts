/**
 * Jev decision client — the only outbound boundary of the extension
 * (`API-01`, `02` §2 `infra/jevClient`).
 *
 * S1 freezes the public surface: type names, field names and the `decide`
 * signature must stay unchanged when `v0.1.1` swaps the local mock for the real
 * HTTP client (ADR-002). `core` depends on `IJevClient` only — never on this
 * file's concrete path.
 *
 * `v0.1.0` ships a local mock implementation: pure function, no network, no API
 * key. Wire format mapping (camelCase → snake_case) and error-code normalization
 * belong to the implementation of this module.
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
