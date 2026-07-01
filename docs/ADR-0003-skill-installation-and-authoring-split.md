# ADR-0003 — Skill Installation and Authoring Split

## Status

Accepted

## Context

AhRE needs to integrate with LLMs. The model must know how to use AhRE, but ordinary project usage should not automatically teach the model how to modify AhRE internals such as recipes, templates, intents, inventory schemas, or MCP tools.

## Decision

AhRE will bundle two classes of skills:

1. **Installable usage skill**: `ahre-usage`, installed by default through `ahre skill install usage`.
2. **Non-default authoring skills**: recipe, template, intent, inventory, and MCP authoring skills.

The usage skill can be installed into project, global, explicit path, or known agent-specific targets.

Authoring skills can be shown or exported, but installation requires an explicit opt-in flag such as `--allow-authoring-skills`.

## Consequences

- Normal users get LLM guidance for using AhRE with low token cost.
- LLMs are discouraged from modifying AhRE itself unless explicitly asked.
- AhRE can still support framework development through dedicated authoring skills.
- Skill installation is versioned through `.ahre/skills/manifest.json`.

## Alternatives Considered

- Install all skills by default.
  - Rejected because it increases the chance of models editing framework internals during ordinary project work.

- Do not bundle skills.
  - Rejected because AhRE would be harder to discover and use consistently across agent tools.

## Related Concepts

- SKILL usage guidance.
- MCP execution bridge.
- CLI fallback with JSON outputs.
- Semantic inventory for compact LLM context.
