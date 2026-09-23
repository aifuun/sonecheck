# SoneCheck

**The sub-second System-1 AI code risk inspector for VS Code.**

SoneCheck reads your staged diff, splits it into hunks, scores each hunk with a
System-1 decision model, and surfaces only the one to three changes that actually
deserve your eyes before you commit.

---

## Status: `0.1.0` is the local MVP

`0.1.0` runs the full local chain: read the staged diff → split it into hunks →
score each hunk → list the risky ones → jump to the code.

The decision service is a **local mock** in this release: no network request is
made, no API key is involved, and there is no degradation branch because there is
no network to fail. The real HTTP client, the failure paths and the API-key
command arrive in `0.1.1`.

## Install

1. Download `sonecheck-0.1.0.vsix` from
   [Releases](https://github.com/rolligen/sonecheck/releases), or take the
   Marketplace listing once it is published.
2. In VS Code: **Extensions → … → Install from VSIX…**
3. Reload the window.

## Use

1. Stage your changes (`git add …`).
2. Run **`SoneCheck: Inspect Staged Diff`** from the command palette.
3. If something looks risky, pick an entry — the editor opens that file at the
   hunk's first line.

Settings (`sonecheck.*`):

| Setting | Default | Meaning |
|---|---|---|
| `riskThreshold` | `0.4` | Score at or above which a hunk is listed (exclusive bounds 0 and 1) |
| `maxItems` | `3` | Maximum number of hunks listed (Top-K) |
| `enabled` | `true` | Global switch |
| `sensitivePathPatterns` | `auth`, `payment`, `migration` | Path substrings treated as sensitive |

## What it never does

- **never blocks a commit** — a failed check ends in a single prompt and passes through;
- **never uploads a whole file** — only diff hunks plus bounded local context (≤ 2 KB per hunks);
- **never touches your workspace** — the check is strictly read-only;
- **never nags** — an all-clear produces no popup, only a transient status line.

No API key, no source file and no telemetry leaves your machine in this release.

---

## Not affiliated

SoneCheck is an independent, unofficial project. It is not affiliated with,
endorsed by, or sponsored by Jev, TypeSafe AI, or any other AI model vendor.
"Jev" and "TypeSafe AI" are the property of their respective owners, referenced
here only to describe a technical dependency.

---

## License

[MIT](LICENSE)

> Design documents are written in Chinese and live in the
> [`docs/` directory](https://github.com/rolligen/sonecheck/tree/main/docs).
> Issues and discussions are welcome via
> [GitHub Issues](https://github.com/rolligen/sonecheck/issues).
