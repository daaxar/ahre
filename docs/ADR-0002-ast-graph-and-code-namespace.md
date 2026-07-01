# ADR-0002 — AST Editing, Code Namespace, and Dependency Graph

## Status

Accepted

## Context

AhRE needs to reduce LLM token usage by executing deterministic architecture intents. The first MVP created skeleton files and inventory, but micro-edits such as adding a method to an entity were performed through conservative text patching. That is acceptable for a prototype but too fragile for real TypeScript projects.

AhRE also needs to build a semantic map of the repository early. This graph will later support cached builds, affected-file analysis, navigation, search, and better LLM context.

## Decision

AhRE 0.2 introduces:

1. `ts-morph` as the TypeScript AST tooling dependency for supported code edits.
2. AST-aware `method.ensure` when `ts-morph` is installed.
3. Conservative fallback text patching with explicit warnings when `ts-morph` is unavailable.
4. A `code` namespace as an agent-friendly alias over recipe and ensure primitives.
5. A dependency graph stored in `.ahre/graph.json`.
6. `graph build`, `graph get file`, `graph affected`, `build plan`, and `search code` commands.

The graph is a cache, not the source of truth. Code remains authoritative.

## Consequences

### Positive

- Safer TypeScript edits for micro-intents.
- Better low-token context for LLMs.
- First primitive for future cached build execution.
- Clearer separation between architecture recipes and development utilities.
- The CLI starts evolving into an injectable architecture/development platform, not just a scaffolder.

### Negative

- AhRE now has a runtime dependency on `ts-morph` for full AST behavior.
- Graph generation is still lightweight and must mature before powering real build execution.
- The fallback path must remain conservative to avoid corrupting source files.

## Alternatives Considered

### Keep text patching only

- Pros: dependency-free and simple.
- Cons: unsafe for real code evolution.

### Build full cached compilation immediately

- Pros: complete build story.
- Cons: too much scope for this iteration; the dependency graph should mature first.

### Make `code` a separate binary

- Pros: clean separation.
- Cons: premature split; commands share inventory, graph, and recipe infrastructure.

## Related Concepts

- Architecture Recipe Engine.
- Semantic inventory.
- Dependency graph cache.
- AST-safe micro-intents.
- Agent-oriented JSON output.
