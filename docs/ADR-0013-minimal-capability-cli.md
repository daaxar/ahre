# ADR-0013: Minimal capability-oriented CLI

## Decision

Expose five primary commands: `find`, `help`, `code`, `inspect`, and `doctor`.

Recipes, intents, templates, packs, tasks, slots, graph, inventory, policies, and quality pipelines remain composable internal concepts. Runtime users and coding agents do not need to navigate those categories directly.

A capability id such as `service.http` is resolved deterministically to built-in or filesystem definitions. `ahre code` executes the full composition and returns a structured report.

## Consequences

- The operational SKILL stays short.
- Agents do not invent recipe or intent command shapes.
- Extension authors retain filesystem-based composition.
- Existing advanced commands remain for compatibility but are not part of the normal workflow.
