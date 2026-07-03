---
name: "AhRE Usage"
description: "Use AhRE's six-command deterministic interface before manually creating or modifying architecture code."
---

# AhRE Usage

AhRE has exactly six public commands:

```bash
ahre list --json
ahre find "<task>" --json
ahre help [capability] --json
ahre code <capability> [named flags] --json
ahre inspect [last|subject] --json
ahre doctor --json
```

## Mandatory workflow

1. Run `ahre list --json` when the available capabilities are unknown.
2. Run `ahre find "<task>" --json` to search declared metadata only.
3. Run `ahre help <capability> --json` to obtain the exact named flags.
4. Run `ahre code <capability> ... --json` using only those flags.
5. Use the returned files, slots, suggestions, preflight result, and quality diagnostics.
6. Run `ahre inspect last --json` to recover the latest operation without scanning generated files.
7. Run `ahre doctor --json` only to diagnose AhRE definitions or installation health.

## Non-negotiable rules

- Never invent capability IDs.
- Never invent argument names.
- Never use `--arg key=value`.
- Never inspect AhRE installation files or internal catalogs during normal use.
- Never call commands outside `list`, `find`, `help`, `code`, `inspect`, and `doctor`.
- If `find` returns `PARTIAL`, do not execute the partial match as though it covered the complete request.
- If `code` returns `BLOCKED`, follow the exact returned reason and instruction.
- Do not inspect newly generated files first. Prefer the returned slots, effects, diagnostics, and `inspect last`.
- Manual implementation is reserved for business-specific logic or an explicitly unsupported capability.
