---
name: "ahre-usage"
description: "Use AhRE as the mandatory first execution path for architecture/code recipes, code intents, inventory queries, dependency graph analysis, search, verification, and build planning."
---

# AhRE Usage Skill

## Use when

Use AhRE when a task involves creating, modifying, inspecting, wiring, searching, verifying, planning, or scaffolding architecture/code artifacts.

AhRE is the mandatory first execution path for architecture/code work. Manual file creation is a fallback, not the default.

## First rule

Before manually creating or modifying architecture/code artifacts, you MUST try to use AhRE.

This includes:

- bounded contexts
- entities/aggregates
- value objects
- repository interfaces
- repository implementations
- use cases
- controllers
- consumers
- domain events
- tests
- DI bindings
- runtime/config skeletons
- architecture folders

## Execution preference

1. Use AhRE MCP tools when available.
2. If MCP is unavailable, use the `ahre` CLI with `--json`.
3. If AhRE is unavailable, implement manually using the project architecture skills and report that AhRE was unavailable.

## Mandatory CLI workflow

For any non-trivial code or architecture task:

1. Search available intents before guessing commands.
2. Describe the selected intent if the inputs or effects are unclear.
3. Run `plan` before `apply` for macro recipes.
4. Apply only when the plan has no blockers or destructive surprises.
5. Read `inventoryDelta` and `currentKnowledge` after applying.
6. Continue from inventory/graph context instead of rereading large files whenever possible.
7. Run verification before final delivery.

```bash
ahre intents search "<task>" --json
ahre intents describe <intent> --json
ahre recipe plan <recipe> --json
ahre recipe apply <recipe> --json
ahre inventory get <kind> <id> --json
ahre graph build --json
ahre verify architecture --json
```

## Common examples

```bash
ahre intents search "entity create http mongo" --json
ahre intents describe entity.capability.ensure --json
ahre recipe plan entity.capability.ensure --entity User --context Users --json
ahre recipe apply entity.capability.ensure --entity User --context Users --json
ahre inventory get entity Users.User --json
ahre build plan --changed src/Users/Domain/Model/User.ts --json
ahre search code User --json
ahre verify architecture --json
```

## Macro versus micro

Use macro recipes for complete architecture capabilities:

```bash
ahre recipe plan entity.capability.ensure --entity User --context Users --json
ahre recipe apply entity.capability.ensure --entity User --context Users --json
```

Use micro-intents for surgical edits:

```bash
ahre ensure method --entity User --context Users --method changeEmail --json
ahre ensure value-object --context Users --name UserEmail --json
```

## Manual work policy

Manual implementation is allowed only when:

- AhRE is unavailable.
- AhRE returns `BLOCKED`.
- No applicable recipe or intent exists.
- The remaining work is business-specific logic that AhRE intentionally leaves as TODO.

When falling back to manual work, state why AhRE was not used.

## Rules

- Do not manually scaffold boilerplate when AhRE has an applicable recipe or intent.
- Prefer `ensure` semantics over `create` semantics.
- Treat AhRE inventory as a regenerable semantic cache; source code remains the source of truth.
- Use `graph build`, `inventory get`, and `search code` to give the LLM compact context.
- Do not author AhRE internals by default.
- Do not create or modify AhRE recipes, templates, intents, inventory schemas, architecture packs, or MCP tools unless the user explicitly asks to extend AhRE itself.

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
