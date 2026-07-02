---
name: "AhRE Usage"
description: "Mandatory minimal workflow for using AhRE before manually creating or modifying code."
---

# AhRE Usage

AhRE is deterministic. The LLM decides what must be built and supplies business logic. AhRE composes definitions, creates or updates files, exposes insertion slots, refreshes inventory/graph, runs quality checks, and reports exactly what happened.

## Mandatory workflow

Before manually writing architecture or scaffold code:

```bash
ahre find "<task>" --json
ahre help <capability> --json
ahre code <capability> [arguments] --json
```

Never invent capability ids or arguments. Use `find` and `help` first when they are unknown.

After `ahre code`, use the returned artifacts, slots, tasks, diagnostics, quality report, and next actions. Do not inspect generated files first.

For later context:

```bash
ahre inspect last --json
ahre inspect <subject> --json
```

Use manual code only for business-specific logic or when AhRE explicitly returns `BLOCKED`, `NOT_FOUND`, or insufficient context.
