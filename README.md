# AhRE CLI v0.8.0

AhRE is a deterministic capability engine for coding agents. It is simple to invoke, composable internally, and explicit about everything it creates or changes.

## Public CLI

```bash
ahre find "http service" --json
ahre help service.http --json
ahre code service.http --service orders --json
ahre inspect last --json
ahre doctor --json
```

That is the intended public surface.

- `find` discovers deterministic capabilities by id, alias, tag, and description.
- `help` explains the workflow and capability arguments.
- `code` converges a capability: it composes dependencies, renders templates, creates or updates files, records slots/tasks, refreshes inventory and graph, and runs quality checks.
- `inspect` returns consolidated repository knowledge without requiring a filesystem scan.
- `doctor` validates definitions, architecture rules, slots, graph state, and installation health.

## Examples

```bash
ahre code service.http --service orders --json
ahre code context.ddd --context Orders --root servs/orders --json
ahre code entity.create --entity Order --context Orders --root servs/orders --json
ahre code consumer.event --event OrderWasCreated --context Orders --root servs/orders --json
ahre code slot.insert --slot Orders.Order.create.domainRules --content-file ./rules.ts --root servs/orders --json
```

## Internal composition

The public capability can internally depend on many definitions:

```text
service.http
├── workspace
├── runtime.node
├── http.express
├── dependency-injection.yaml
├── security.jwt-rbac
├── testing.jest-cucumber
└── quality.typescript
```

Definitions live in human-readable filesystem trees. Existing `packs/`, recipes, intents, templates, policies, tasks, slots, inventory, graph and quality machinery remain implementation details and extension mechanisms. They are not required knowledge for normal AhRE use.

## Deterministic response

A mutation reports:

- created, updated, existing, blocked and skipped artifacts;
- composed dependencies and executed tasks;
- deterministic logic slots with file/class/method coordinates;
- graph and inventory updates;
- formatter, lint, typecheck, architecture, test and coverage results;
- normalized diagnostics with file, line, column, rule and matching slot;
- explicit next actions for the LLM.

AhRE does not choose business logic. The LLM does.

## Compatibility

Earlier command groups remain available for compatibility and authoring, but are intentionally omitted from the primary help and operational skill.
