/**
 * Cross-layer named constants — the single place where judgement parameters are
 * allowed to exist as literals (`02` §1「跨层常量」, `INV-07`).
 *
 * Pure data module: it belongs to no layer, imports nothing, and is read-only
 * for UI / Core / Infra. Never add logic or IO here — `GUARD-03` treats any
 * `0.85` / `2048` literal outside this file as a failure.
 */

/**
 * Hard upper bound of one serialized outbound payload, `contextCode` included.
 * Fixed by contract `INV-02` (2 KB); not a tuning knob.
 */
export const MAX_PAYLOAD_BYTES = 2048;

/**
 * Fallback context window: lines kept before/after the hunk when scope
 * detection fails (`300-design` §4.1). S3 backfills the final value from S2
 * Harness data.
 */
export const CONTEXT_WINDOW_LINES = 10;

/**
 * Default risk threshold, mirroring `CFG-01` (`sonecheck.riskThreshold`).
 * S3 backfills the final value from S2 Harness data.
 */
export const RISK_THRESHOLD = 0.85;

/** Default pick-list cap (Top-K), mirroring `CFG-01` (`sonecheck.maxItems`). */
export const MAX_ITEMS = 3;

/** Upper bound for `git diff --staged` stdout (bytes) passed to `execSync`. */
export const GIT_MAX_BUFFER = 32 * 1024 * 1024;

/**
 * Build-time logging switch. `v0.1.0` has no runtime logging at all; the flag
 * exists so that `tsc` folds the detailed-field branch away in release builds
 * (`06` §2 / §4) and users cannot enable it via settings.
 */
export const DEBUG_LOGGING = false;
