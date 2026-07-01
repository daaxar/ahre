# ADR-0007: ms-expeditions architecture pack

## Status

Accepted

## Context

AhRE needs executable templates, recipes and intents aligned with the architecture described in `ARCHITECTURE.md`: Clean Architecture, Hexagonal adapters, DDD bounded contexts, CQRS, domain events, YAML DI, HTTP controllers, AMQP/SQS consumers, Mongo/TypeORM/Redis/S3 adapters, PDF/XLSX generation, JWT/RBAC, Jest/Cucumber tests and Docker runtime files.

## Decision

Add a bundled architecture pack named `ms-expeditions-clean-ddd` with inspectable templates, recipes, intents and policies. Keep AhRE generic, but allow recipes to apply this pack to projects through idempotent `ensure` operations.

## Consequences

- Agents can discover executable architecture capabilities with low token cost.
- Project scaffolding becomes convergent and inventory-backed.
- Business rules remain TODOs; AhRE generates structure, not domain truth.
- Future packs can follow the same shape.
