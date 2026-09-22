# SoneCheck

**The sub-second System-1 AI code risk inspector for VS Code.**

SoneCheck reads your staged diff, splits it into hunks, scores each hunk with a
System-1 decision model, and surfaces only the one to three changes that actually
deserve your eyes before you commit.

---

## Status: `0.0.1` is a name reservation

**This release contains no functional implementation.** It reserves the
Marketplace listing `rolligen.sonecheck` ahead of the first working version,
`0.1.0`.

Running `SoneCheck: Show Status` from the command palette will tell you the same
thing — there is no inspection logic behind it yet.

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
> [`docs/` directory](https://github.com/rolligen/sonecheck/tree/main/docs).
> Issues and discussions are welcome via
> [GitHub Issues](https://github.com/rolligen/sonecheck/issues).
