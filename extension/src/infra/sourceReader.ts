import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/**
 * Read the working-tree lines of a repository-relative file.
 *
 * Read-only by design (`INV-05`): the file is never written, staged or formatted.
 * A failure (deleted, renamed or binary file) returns an empty array rather than
 * `null` — pure-function failure semantics of `dev-meta/docs/06` §5.
 */
export function readSourceLines(repoRoot: string, filePath: string): string[] {
  try {
    const absolute = isAbsolute(filePath) ? filePath : join(repoRoot, filePath);
    return readFileSync(absolute, 'utf8').split(/\r?\n/);
  } catch {
    return [];
  }
}
