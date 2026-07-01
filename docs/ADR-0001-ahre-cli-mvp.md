# ADR-0001 — AhRE CLI MVP

## Status

Accepted

## Context

LLM agents waste tokens and introduce inconsistencies when they generate repetitive architectural boilerplate such as controllers, use cases, repositories, tests, and DI placeholders manually.

The target architecture uses monorepo boundaries, Clean Architecture, Hexagonal adapters, DDD bounded contexts, repository interfaces, domain events, YAML DI, Jest/Cucumber tests, and runtime conventions.

## Decision

Create AhRE as a CLI-first Architecture Recipe Engine.

AhRE exposes intents and recipes. Recipes are composable from macro to micro and use `ensure` semantics. They converge the repository toward a desired architectural state, update semantic inventory, and return compact JSON for LLM agents.

The MVP is dependency-free and supports:

- intent discovery;
- recipe plan/apply;
- entity create capability recipe;
- entity skeleton ensuring;
- method ensuring;
- semantic inventory;
- cheap architecture verification.

## Consequences

### Positive

- Lower token usage for repetitive tasks.
- More deterministic scaffolding.
- Better context continuity for LLMs through inventory.
- Idempotent workflows.
- Clear separation between LLM reasoning and mechanical code generation.

### Negative

- MVP TypeScript edits are conservative text patches, not full AST transformations.
- Generated files are skeletons, not business-complete implementations.
- Inventory rebuild is partial until AST scanning is implemented.

## Alternatives Considered

### LLM-only generation

- Pros: flexible, no tool required.
- Cons: token-heavy, inconsistent, harder to audit.

### File-level scaffolder only

- Pros: simple.
- Cons: too low-level; does not model architectural capabilities.

### Full AST engine first

- Pros: safer edits.
- Cons: slower to validate concept.

## Related Skills

- monorepo architecture
- service workspace clean architecture
- bounded context DDD
- domain model aggregates
- application use cases CQRS
- persistence adapters
- HTTP API controllers
- dependency injection YAML
- testing strategy
