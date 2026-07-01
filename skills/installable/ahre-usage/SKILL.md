---
name: "ahre-usage"
description: "Use AhRE to execute architecture recipes, code intents, inventory queries, dependency graph analysis, search, verification, and build planning with low token cost."
---

# AhRE Usage Skill

## Use when

Use AhRE when a task involves creating, modifying, inspecting, wiring, verifying, or planning architecture/code artifacts.

Prefer AhRE over manual file generation when an intent or recipe exists.

## Execution preference

1. Use AhRE MCP tools when available.
2. If MCP is unavailable, use the `ahre` CLI with `--json`.
3. If AhRE is unavailable, implement manually using the project architecture skills and report that AhRE was unavailable.

## CLI-first workflow

1. Search available intents before guessing command names.
2. Describe the selected intent if the inputs or effects are unclear.
3. Run `plan` before `apply` for macro recipes.
4. Apply only when the plan has no blockers or destructive surprises.
5. Read `inventoryDelta` and `currentKnowledge` after applying.
6. Continue from inventory/graph context instead of rereading large files whenever possible.
7. Run verification before final delivery.

## Common CLI commands

```bash
ahre intents search "entity create http mongo" --json
ahre intents describe entity.capability.ensure --json
ahre recipe plan entity.capability.ensure --entity User --context Users --json
ahre recipe apply entity.capability.ensure --entity User --context Users --json
ahre inventory get entity Users.User --json
ahre graph build --json
ahre build plan --changed src/Users/Domain/Model/User.ts --json
ahre search code User --json
ahre verify architecture --json
```

## Rules

- Prefer macro recipes for capabilities.
- Prefer micro-intents for surgical edits.
- Prefer `ensure` semantics over `create` semantics.
- Treat AhRE inventory as a regenerable semantic cache; source code remains the source of truth.
- Use `graph build` and `inventory get` to give the LLM compact context.
- Do not author AhRE internals by default.
- Do not create or modify AhRE recipes, templates, intents, inventory schemas, or MCP tools unless the user explicitly asks to extend AhRE itself.

## Stop conditions

Stop and ask when:

- AhRE returns `BLOCKED`.
- A plan shows destructive changes.
- Business rules, schemas, security, persistence behavior, or public contracts are ambiguous.
- The requested shortcut violates architecture boundaries.

## Output handling

Use these fields from AhRE JSON responses:

- `status`
- `effects`
- `inventoryDelta`
- `currentKnowledge`
- `warnings`
- `blocked`
- `nextSuggestedIntents`

Summarize what AhRE did instead of pasting generated files.
