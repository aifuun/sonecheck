# SoneCheck

**The sub-second System-1 AI code risk inspector for VS Code and Git hooks.**

SoneCheck reads your staged diff, splits it into hunks, scores each hunk with a
System-1 decision model, and surfaces only the one to three changes that actually
deserve your eyes before you commit.

> **Project documentation is written in Chinese**: see [`docs/`](docs/) for the
> full product requirements, technical spec, system design, contracts, UI design,
> roadmap and observability plan.

---

## Status: `0.0.1` is a name reservation

**This release contains no functional implementation.** It exists to reserve the
`sonecheck` package name ahead of the first working version.

Installing it will not give you a working tool. Every exported API throws a
descriptive `SONECHECK_NOT_IMPLEMENTED` error rather than failing silently:

```js
const { inspectStaged } = require('sonecheck');

inspectStaged();
// Error: sonecheck@0.0.1 does not implement "inspectStaged" yet. ...
//   code: 'SONECHECK_NOT_IMPLEMENTED'
```

The first functional release will be **`0.1.0`**. This placeholder exists only so
that the name is not taken by an unrelated project in the meantime.

---

## Why this exists

AI coding tools made code *generation* far faster than code *review*. A single
commit can now span dozens of hunks across many files, and nobody reads all of
them. Review queues back up and low-quality changes get waved through.

Existing generative-AI reviewers make this worse in three ways: they are slow
(5–15s per review, so people skip them), they are expensive (billed per generated
token), and they hallucinate (they rewrite code and invent explanations).

SoneCheck removes the *generation* step entirely. A System-1 decision model
outputs structured choices and scores instead of prose, so scoring returns in a
fraction of a second, costs next to nothing, and cannot hallucinate code.

---

## What is planned

| Milestone | Scope |
|-----------|-------|
| M1 — local MVP | Read staged diff → split hunks → score → show top risks → jump to the line |
| M2 — distributable | `.vsix` package and a documented install path |
| M3 — trustworthy | Better context assembly, tunable thresholds, false-positive feedback |
| M4 — team-ready | Hosted option, shared team rules, audit trail |

Design principles the implementation must hold to:

- **Never block a commit.** If the decision service is unreachable, the check is
  skipped and the developer is told once. Failures always resolve to "let it pass".
- **Never upload a whole file.** Only diff hunks plus bounded local context
  (≤ 2KB per hunk) leave the machine.
- **Never touch your workspace.** The check is strictly read-only.
- **Never nag.** All-clear runs silently, with no popup.

These are recorded as testable invariants in
[`docs/03_CONTRACTS_AND_API.md`](docs/03_CONTRACTS_AND_API.md).

---

## Privacy boundary

SoneCheck is designed so that sensitive source never leaves the machine wholesale:

- Only the hunks you have staged, plus a bounded slice of surrounding context,
  are sent for scoring.
- Your API key is stored in the OS-level secret store, never in a plain file, and
  never written to logs.
- The extension never modifies, stages, formats or deletes your files.

The full payload boundary is specified in
[`docs/03_CONTRACTS_AND_API.md`](docs/03_CONTRACTS_AND_API.md) §1.

---

## Not affiliated

SoneCheck is an independent, unofficial project. It is not affiliated with,
endorsed by, or sponsored by Jev, TypeSafe AI, or any other AI model vendor.
"Jev" and "TypeSafe AI" are the property of their respective owners, referenced
here only to describe a technical dependency.

---

## Contributing

The project is at the design stage. Issues and discussions are welcome via
[GitHub Issues](https://github.com/aifuun/sonecheck/issues).

---

## License

[MIT](LICENSE)
