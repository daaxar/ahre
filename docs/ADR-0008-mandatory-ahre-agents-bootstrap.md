# ADR-0008: Mandatory AhRE Agents Bootstrap

## Status

Accepted

## Context

Installing the AhRE usage skill into `.agents` is not enough for an isolated coding-agent execution. Some agents read `AGENTS.md` reliably but do not automatically discover local skill folders. A soft instruction such as "discover and apply the skill" can be interpreted as optional, which allows the model to manually scaffold code before trying AhRE.

## Decision

`ahre skill install usage` must bootstrap `AGENTS.md` with an idempotent mandatory AhRE block.

The block must instruct agents to:

- read `.agents/ahre-usage/SKILL.md` before code or architecture work;
- treat AhRE as the mandatory first execution path;
- avoid manually scaffolding architecture/code artifacts before attempting AhRE;
- follow the minimum workflow: `intents search`, `intents describe`, `recipe plan`, `recipe apply`, `inventory get`, and `verify architecture`;
- fall back to manual implementation only when AhRE is unavailable, blocked, lacks an applicable intent/recipe, or the remaining work is business-specific logic.

The AhRE usage skill itself must mirror the same mandatory policy.

## Consequences

- Fresh model executions are more likely to use AhRE before writing code.
- `AGENTS.md` becomes a reliable bridge to the installed skill, even when `.agents` discovery is not automatic.
- The installed block is more verbose, but intentionally so: it must be operational, not merely descriptive.
- Manual work remains possible, but only after an explicit AhRE attempt or documented fallback.

## Alternatives Considered

- Keep only the skill and rely on tool discovery.
  - Rejected because tool discovery behavior varies across agents.
- Keep a short AGENTS.md reference.
  - Rejected because short wording was too weak for isolated runs.
- Inline the entire skill into AGENTS.md.
  - Rejected because it duplicates the skill and makes updates harder.

## Related Skills

- ahre-usage
- ahre-architecture-pack-authoring
