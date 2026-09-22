/**
 * Infra Facade — the only entry the Core layer may import (`02` §1).
 *
 * S1 re-exports the frozen decision-service contract. `core` depends on
 * `IJevClient` only: the concrete implementation is injected by the assembly
 * layer, so `v0.1.1` can replace the mock without touching callers (ADR-002).
 */

export type {
  ChangeType,
  DecisionResult,
  HunkPayload,
  IJevClient,
  ReasonCode,
} from './jevClient';
