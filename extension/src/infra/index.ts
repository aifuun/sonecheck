/**
 * Infra Facade — the only entry the Core layer may import (`02` §1).
 *
 * S0: scaffold. From S1 on this module re-exports the frozen `IJevClient`
 * abstraction; concrete infra modules (`git` / `diffParser` / `jevClient` /
 * `configSource`) are re-exported from S2/S4 on. `core` must never import a
 * concrete infra path directly.
 */

export {};
