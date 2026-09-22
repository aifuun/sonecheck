# SoneCheck

**The sub-second System-1 AI code risk inspector for VS Code.**

SoneCheck reads your staged diff, splits it into hunks, scores each hunk with a
System-1 decision model, and surfaces only the one to three changes that actually
deserve your eyes before you commit.

---

## Status: `0.0.1` is a name reservation

**This release contains no functional implementation.** It reserves the
`sonecheck` package name ahead of the first working version, `0.1.0`. Every
exported API throws a descriptive error rather than failing silently:

```js
const { inspectStaged } = require('sonecheck');
inspectStaged();
// Error: sonecheck@0.0.1 does not implement "inspectStaged" yet. ...
```

---

## How it works

A single commit can span dozens of hunks across many files, and nobody reads all
of them. SoneCheck scores each hunk and shows only the top few, so review effort
lands where it matters.

Scoring uses a System-1 decision model, which returns structured scores instead
of prose — fast, cheap, and incapable of hallucinating code.

The implementation must always:

- **never block a commit** — if the decision service is unreachable, the check is
  skipped and you are told once;
- **never upload a whole file** — only diff hunks plus bounded local context;
- **never touch your workspace** — the check is strictly read-only;
- **never nag** — an all-clear produces no popup.

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
> [`docs/` directory](https://github.com/aifuun/sonecheck/tree/main/docs).
> Issues and discussions are welcome via
> [GitHub Issues](https://github.com/aifuun/sonecheck/issues).
