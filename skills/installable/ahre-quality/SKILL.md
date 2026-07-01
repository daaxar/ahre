---
name: "AhRE Quality"
description: "Use AhRE deterministic quality feedback: format, lint, typecheck, architecture, slot integrity, tests, coverage, and diagnostics."
---

# AhRE Quality

Use this skill when AhRE returns quality diagnostics, skipped checks, or the user asks for validation.

## Commodity post-mutation behavior

After any mutating AhRE command, AhRE automatically runs the default quality pipeline in `fast` mode unless `--quality off` is provided.

Default static checks include:

- formatter command when configured;
- lint command when configured;
- typecheck command when configured;
- architecture verification;
- slot integrity;
- index/graph refresh after mutation.

Tests and coverage run in `full` mode or when explicitly requested/configured.

## Commands

```bash
ahre quality run --json
ahre quality run --mode full --json
ahre quality static --json
ahre quality format --json
ahre quality lint --json
ahre quality typecheck --json
ahre quality test --json
ahre quality coverage --json
```

## Interpreting diagnostics

Use `quality.diagnostics[]`. Diagnostics are normalized and may include:

- `tool`
- `file`
- `line`
- `column`
- `severity`
- `rule`
- `message`
- `slot`

If a diagnostic includes `slot`, prefer fixing the code through that slot or editing the precise file/range if business logic requires it.

Do not parse raw tool logs unless AhRE exposes only summarized output and more detail is required.
