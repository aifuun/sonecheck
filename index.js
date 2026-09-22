'use strict';

/**
 * sonecheck 0.0.1 — name-reservation release.
 *
 * This release contains no functional implementation. It exists to reserve the
 * public package name `sonecheck` before the first working version ships.
 *
 * Every exported entry point throws a descriptive error instead of failing
 * silently, so that anyone who installs this version learns immediately where
 * the real implementation lives.
 *
 * Roadmap and design documents: https://github.com/aifuun/sonecheck
 *
 * @see README.md
 */

/** Error code attached to every "not implemented yet" error. */
const NOT_IMPLEMENTED = 'SONECHECK_NOT_IMPLEMENTED';

/** Version of the placeholder release. */
const RESERVED_VERSION = '0.0.1';

/** The first release expected to contain a working implementation. */
const FIRST_FUNCTIONAL_VERSION = '0.1.0';

/**
 * Build the error thrown by every placeholder entry point.
 *
 * @param {string} apiName Name of the API that was called.
 * @returns {Error & { code: string }} A descriptive, non-silent error.
 */
function createNotImplementedError(apiName) {
  const error = new Error(
    `sonecheck@${RESERVED_VERSION} does not implement "${apiName}" yet. ` +
      `This version only reserves the package name. ` +
      `The first functional release is ${FIRST_FUNCTIONAL_VERSION}. ` +
      `Status: https://github.com/aifuun/sonecheck`
  );
  error.code = NOT_IMPLEMENTED;
  return error;
}

/**
 * Inspect an arbitrary set of changes for risk. Not implemented in 0.0.1.
 *
 * @returns {never} Always throws.
 */
function inspect() {
  throw createNotImplementedError('inspect');
}

/**
 * Inspect the staged diff of the current repository. Not implemented in 0.0.1.
 *
 * @returns {never} Always throws.
 */
function inspectStaged() {
  throw createNotImplementedError('inspectStaged');
}

module.exports = {
  NOT_IMPLEMENTED,
  RESERVED_VERSION,
  FIRST_FUNCTIONAL_VERSION,
  inspect,
  inspectStaged,
};
