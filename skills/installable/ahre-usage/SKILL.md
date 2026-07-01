---
name: "AhRE Usage"
description: "Mandatory entrypoint for agents using AhRE before creating or modifying architecture/code artifacts. Routes to generation, context, and quality skills."
---

# AhRE Usage

Use this skill before creating, modifying, wiring, searching, verifying, or planning code/architecture artifacts.

AhRE is deterministic. It creates files, updates indexes, exposes slots, runs checks, and reports diagnostics. The LLM decides architecture intent and business logic.

## Mandatory rule

Before writing code manually, try AhRE first.

Do not manually scaffold bounded contexts, entities, value objects, repositories, use cases, controllers, consumers, events, tests, DI bindings, runtime files, or architecture folders when AhRE has an applicable intent or recipe.

## Load only the smallest extra skill

Do not load every AhRE skill by default.

- For generation or modification, read `.agents/ahre-generation/SKILL.md`.
- For locating artifacts, slots, tasks, inventory, index, or graph without reading files, read `.agents/ahre-context/SKILL.md`.
- For format, lint, typecheck, tests, coverage, diagnostics, or skipped checks, read `.agents/ahre-quality/SKILL.md`.

## Minimal workflow

```bash
ahre intents search "<task>" --json
ahre recipe plan <recipe> --json
ahre recipe apply <recipe> --json
```

After any mutating AhRE command, inspect the returned `quality` report. AhRE runs default post-action static checks automatically.

Do not inspect generated files first. Use returned `logicSlots`, `currentKnowledge`, `tasks`, `graph`, and `quality` before reading files.

Manual implementation is allowed only when AhRE is unavailable, returns `BLOCKED`, has no applicable intent/recipe, or business-specific logic intentionally remains for the LLM.
