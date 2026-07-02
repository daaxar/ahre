# ADR-0014: Executable filesystem definitions

## Status

Accepted in v0.8.1.

## Context

v0.8.0 exposed a minimal public CLI, but its bundled architecture templates were mostly documentation stubs and public capabilities were hardcoded in the CLI. The filesystem catalog was therefore not the real source of generation behavior.

## Decision

Bundled public capabilities are discovered from recipe metadata. Recipes compose intents, intents reference templates, and templates contain real source trees with exact target mappings. AhRE core remains a generic loader, renderer, validator, executor and reporter.

The authoring skills define the full executable contract and require a `find -> help -> code -> inspect` smoke test.

## Consequences

Humans and coding agents can navigate and extend architecture generation without modifying AhRE core. Runtime users retain the five-command public interface.
