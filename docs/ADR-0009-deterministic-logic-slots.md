# ADR-0009: Deterministic Logic Slots

## Status

Accepted

## Context

AhRE recipes create many files with low token cost, but agents were reading generated files immediately afterward to discover where business-specific logic should be placed. That defeats part of the purpose of deterministic scaffolding and increases token use.

## Decision

AhRE recipes now generate deterministic `AHRE_SLOT` markers in generated files and report those slots in JSON output and semantic inventory. AhRE does not decide business logic. The LLM remains responsible for deciding which logic belongs where, guided by AGENTS/SKILL rules. AhRE only provides exact placement coordinates and can insert supplied content into a selected slot.

## Consequences

- Agents can continue from `logicSlots`, `tasks`, and `nextForLLM` without reading generated files first.
- Business-specific implementation remains controlled by the LLM/user.
- AhRE stays deterministic and avoids becoming a business-rule planner.
- Templates must keep slot IDs stable or versioned.

## Related Commands

- `ahre slot list --json`
- `ahre slot get <slotId> --json`
- `ahre task list --json`
- `ahre code insert-slot --slot <slotId> --content-file <file> --json`
