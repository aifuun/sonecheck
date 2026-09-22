/**
 * Infra Facade — the only entry the Core layer may import (`02` §1).
 *
 * `core` depends on `IJevClient` only: the concrete implementation is injected by
 * the assembly layer, so `v0.1.1` can replace the mock without touching callers
 * (ADR-002). `src/infra/**` internals stay private.
 */

export { createMockJevClient, scoreHunk, serializePayload } from './jevClient';
export { parseDiff } from './diffParser';
export { truncateToWireBytes, wireBytes } from './jevClient';

export type {
  ChangeType,
  DecisionPolicy,
  DecisionResult,
  HunkPayload,
  IJevClient,
  ReasonCode,
  ScoreInput,
} from './jevClient';
export type { Hunk } from './diffParser';
