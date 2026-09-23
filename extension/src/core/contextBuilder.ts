import { CONTEXT_WINDOW_LINES, MAX_PAYLOAD_BYTES, PAYLOAD_JSON_FRAME_BYTES } from '../constants';
import { truncateToWireBytes, wireBytes } from '../infra';
import type { Hunk } from '../infra';

/**
 * Build the bounded context of a hunk (`300-design` §4.1).
 *
 * Scope detection is a brace-matching backtrack from the first changed line;
 * when it fails (non-brace language, single-line file, unbalanced braces) the
 * fixed window fallback is used. The result is then truncated to the *remaining*
 * payload budget so that the serialized payload stays within `MAX_PAYLOAD_BYTES`
 * (`INV-02`) while the changed lines survive.
 *
 * All measurements are *wire* lengths (JSON escaping included), because the wire
 * payload — not the raw text — is what the invariant bounds.
 *
 * Pure function: no IO, no VS Code API, repeatable.
 */
export function buildContext(hunk: Hunk, sourceLines: string[]): string {
  if (sourceLines.length === 0) return '';

  const changeIndex = clamp(hunk.startLine - 1, 0, sourceLines.length - 1);
  const scope = findEnclosingScope(sourceLines, changeIndex) ?? fixedWindow(sourceLines.length, changeIndex);

  return truncateLines(
    sourceLines.slice(scope.start, scope.end + 1),
    contextBudgetBytes(hunk),
    changeIndex - scope.start,
  );
}

/**
 * Wire bytes left for `contextCode` after the other payload fields are accounted
 * for. The frame constant covers the JSON keys and punctuation; each value is
 * measured as its exact wire length.
 */
export function contextBudgetBytes(hunk: Hunk): number {
  const others =
    wireBytes(hunk.filePath) + wireBytes(hunk.changeType) + wireBytes(hunk.diffContent);
  return Math.max(0, MAX_PAYLOAD_BYTES - PAYLOAD_JSON_FRAME_BYTES - others);
}

interface Scope {
  start: number;
  end: number;
}

/**
 * Enclosing brace-delimited block of `index`, or `null` when the braces do not
 * balance (which makes the scope undecidable).
 */
function findEnclosingScope(sourceLines: string[], index: number): Scope | null {
  let depth = 0;
  let start = -1;

  for (let i = index; i >= 0; i -= 1) {
    depth += count(sourceLines[i], '}') - count(sourceLines[i], '{');
    if (depth < 0) {
      start = i;
      break;
    }
  }

  if (start < 0) return null;

  depth = 0;
  for (let i = start; i < sourceLines.length; i += 1) {
    depth += count(sourceLines[i], '{') - count(sourceLines[i], '}');
    if (depth === 0) return { start, end: i };
  }

  return null;
}

function fixedWindow(totalLines: number, index: number): Scope {
  return {
    start: Math.max(0, index - CONTEXT_WINDOW_LINES),
    end: Math.min(totalLines - 1, index + CONTEXT_WINDOW_LINES),
  };
}

/**
 * Trim `lines` down to `budget`, tail first, never dropping the changed line; a
 * single line larger than the budget is truncated so that the hard `INV-02`
 * bound still holds.
 */
function truncateLines(lines: string[], budget: number, changeOffset: number): string {
  if (budget <= 0) return '';

  let start = 0;
  let end = lines.length - 1;

  while (end > start && wireBytes(joinRange(lines, start, end)) > budget) {
    // Drop from the tail; when the tail *is* the changed line, drop from the head instead.
    if (end === changeOffset) start += 1;
    else end -= 1;
  }

  const result = joinRange(lines, start, end);
  return wireBytes(result) <= budget ? result : truncateToWireBytes(result, budget);
}

function joinRange(lines: string[], start: number, end: number): string {
  return lines.slice(start, end + 1).join('\n');
}

function count(value: string, needle: string): number {
  let total = 0;
  for (const char of value) if (char === needle) total += 1;
  return total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
