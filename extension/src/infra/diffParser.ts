import { HUNK_METADATA_RESERVE_BYTES, MAX_PAYLOAD_BYTES } from '../constants';
import { truncateToWireBytes, wireBytes, WIRE_LINE_SEPARATOR_BYTES } from './jevClient';
import type { ChangeType } from './jevClient';

/**
 * A single changed block of a staged diff (`400-build` §1.1 `Hunk`).
 *
 * `changeType` is derived from the file headers (`/dev/null` markers) so that
 * `core/riskEngine` can assemble the `HunkPayload` without re-parsing the diff.
 */
export interface Hunk {
  /** Repository-relative path of the file the hunk belongs to. */
  filePath: string;
  /** First line of the hunk in the new revision (1-based). */
  startLine: number;
  /** Kind of change applied to the file. */
  changeType: ChangeType;
  /** Hunk header plus its changed lines. */
  diffContent: string;
}

/** Upper bound of one hunk's `diff_hunk`, leaving room for the rest of the payload. */
const MAX_DIFF_WIRE_BYTES = MAX_PAYLOAD_BYTES - HUNK_METADATA_RESERVE_BYTES;

/** `@@ -oldStart[,oldCount] +newStart[,newCount] @@` */
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
/** `diff --git a/<path> b/<path>` */
const DIFF_HEADER = /^diff --git "?a\/(.+?)"? "?b\/(.+?)"?$/;

interface RawLine {
  text: string;
  /** Line number this entry occupies in the new revision. */
  lineNumber: number;
}

interface RawHunk {
  filePath: string;
  changeType: ChangeType;
  header: string;
  lines: RawLine[];
}

/**
 * Parse a unified diff into hunks.
 *
 * Pure function, no IO. Binary files are skipped and an empty diff yields `[]`
 * rather than throwing — failures return an empty result, never `null`
 * (`dev-meta/docs/06` §5).
 *
 * Oversized hunks are split so that every emitted hunk fits one `API-01`
 * payload under `INV-02` (`300-design` §4.3): git's hunk is not a wire unit,
 * the payload is.
 */
export function parseDiff(diffText: string): Hunk[] {
  if (diffText.length === 0) return [];

  return collectRawHunks(diffText).flatMap(splitRawHunk);
}

/** First pass: group the diff by file/hunk and resolve the new-revision line numbers. */
function collectRawHunks(diffText: string): RawHunk[] {
  const raw: RawHunk[] = [];
  const lines = diffText.split(/\r?\n/);

  let filePath: string | null = null;
  let changeType: ChangeType = 'MODIFY';
  let isBinary = false;
  let current: RawHunk | null = null;
  let cursor = 1;

  const emit = (): void => {
    if (current !== null && filePath !== null && !isBinary && current.lines.length > 0) raw.push(current);
    current = null;
  };

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      emit();
      isBinary = false;
      changeType = 'MODIFY';
      const match = DIFF_HEADER.exec(line);
      filePath = match === null ? null : match[2];
      continue;
    }

    if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
      emit();
      isBinary = true;
      continue;
    }

    if (line.startsWith('--- ')) {
      if (line.slice(4).trim() === '/dev/null') changeType = 'ADD';
      continue;
    }

    if (line.startsWith('+++ ')) {
      const target = line.slice(4).trim();
      if (target === '/dev/null') changeType = 'DELETE';
      else filePath = stripPrefix(target);
      continue;
    }

    const header = HUNK_HEADER.exec(line);
    if (header !== null) {
      emit();
      cursor = Math.max(1, Number.parseInt(header[1], 10));
      current = filePath === null
        ? null
        : { filePath, changeType, header: line, lines: [] };
      continue;
    }

    if (current === null) continue;
    if (line.startsWith('\\ No newline at end of file')) continue;

    current.lines.push({ text: line, lineNumber: cursor });
    // Deleted lines do not advance the new-revision cursor.
    if (!line.startsWith('-')) cursor += 1;
  }

  emit();
  return raw;
}

/**
 * Second pass: cut a raw hunk into payload-sized hunks, keeping line order and
 * each sub-hunk's true start line. A single line larger than the budget
 * (minified bundle) is truncated instead of breaking `INV-02`.
 */
function splitRawHunk(raw: RawHunk): Hunk[] {
  const headerWire = wireBytes(raw.header);
  const out: Hunk[] = [];

  let lines: string[] = [];
  let startLine = raw.lines[0].lineNumber;
  let wire = headerWire;

  const flush = (): void => {
    if (lines.length === 0) return;
    out.push({
      filePath: raw.filePath,
      startLine,
      changeType: raw.changeType,
      diffContent: [raw.header, ...lines].join('\n'),
    });
    lines = [];
  };

  for (const line of raw.lines) {
    if (lines.length > 0 && wire + WIRE_LINE_SEPARATOR_BYTES + wireBytes(line.text) > MAX_DIFF_WIRE_BYTES) {
      flush();
      wire = headerWire;
    }

    if (lines.length === 0) startLine = line.lineNumber;

    const text =
      wire + WIRE_LINE_SEPARATOR_BYTES + wireBytes(line.text) > MAX_DIFF_WIRE_BYTES
        ? truncateToWireBytes(line.text, MAX_DIFF_WIRE_BYTES - headerWire - WIRE_LINE_SEPARATOR_BYTES)
        : line.text;

    wire += WIRE_LINE_SEPARATOR_BYTES + wireBytes(text);
    lines.push(text);
  }

  flush();
  return out;
}

/** Drop the `a/` / `b/` prefix git puts in front of quoted paths. */
function stripPrefix(rawPath: string): string {
  const unquoted = rawPath.replace(/^"(.*)"$/, '$1');
  return unquoted.replace(/^[ab]\//, '');
}
