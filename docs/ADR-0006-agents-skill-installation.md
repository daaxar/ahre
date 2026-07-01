# ADR-0006 — Install AhRE usage skill into `.agents` and bootstrap `AGENTS.md`

## Status

Accepted

## Context

AhRE provides a user-facing skill that teaches LLMs how to use the CLI/MCP workflow. Installing this skill under `.ahre/skills` coupled agent guidance to AhRE internals and did not automatically tell agents to use it when developing code.

The repository should expose agent-facing guidance from an agent-oriented location, while keeping AhRE itself agnostic to the project architecture.

## Decision

`ahre skill install usage` installs the usage skill into `.agents` by default.

The command also ensures a root `AGENTS.md` exists:

- if missing, create a minimal one;
- if present, append an idempotent AhRE usage block;
- if the block already exists, update it in place.

The skill destination can be overridden with `--to` or `--path`. The `AGENTS.md` bootstrap can be skipped with `--no-agents-md`.

## Consequences

- Agents discover AhRE usage guidance from a conventional agent-facing folder.
- Existing `AGENTS.md` files are preserved and only receive a marked AhRE block.
- The CLI remains independent from the external installer.
- Projects that manage agent instructions differently can opt out of `AGENTS.md` changes.

## Alternatives Considered

- Continue installing into `.ahre/skills`: rejected because `.ahre` is AhRE internal state, not necessarily an agent discovery location.
- Only install the skill and avoid `AGENTS.md`: rejected because many agents require a top-level instruction file to be consistently reminded to use discovered skills.
