/**
 * Type definitions for sonecheck 0.0.1 — name-reservation release.
 *
 * No functional implementation is available in this version.
 */

/** Error code attached to every "not implemented yet" error. */
export declare const NOT_IMPLEMENTED: 'SONECHECK_NOT_IMPLEMENTED';

/** Version of the placeholder release. */
export declare const RESERVED_VERSION: '0.0.1';

/** The first release expected to contain a working implementation. */
export declare const FIRST_FUNCTIONAL_VERSION: '0.1.0';

/** Error thrown by every placeholder entry point in 0.0.1. */
export interface SoneCheckNotImplementedError extends Error {
  code: typeof NOT_IMPLEMENTED;
}

/**
 * Inspect an arbitrary set of changes for risk.
 *
 * @throws {SoneCheckNotImplementedError} Always, until 0.1.0.
 */
export declare function inspect(): never;

/**
 * Inspect the staged diff of the current repository.
 *
 * @throws {SoneCheckNotImplementedError} Always, until 0.1.0.
 */
export declare function inspectStaged(): never;
