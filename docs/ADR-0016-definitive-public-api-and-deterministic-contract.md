# ADR-0016: Definitive public API and deterministic capability contract

## Status

Accepted for AhRE 0.9.0.

## Decision

AhRE exposes exactly six commands: `list`, `find`, `help`, `code`, `inspect`, and `doctor`. Previous operational commands and the public recipe/intent/template taxonomy are removed, not aliased.

Capability discovery and search use only declared metadata. Search reports matched and unmatched terms, coverage, score, and `MATCH`, `PARTIAL`, or `NOT_FOUND`; a partial match is never promoted to an executable recommendation.

A capability is the sole authoring concept. It declares typed named arguments, naming normalization, required relationships, optional suggestions, alternatives, preconditions, files, and slot semantics. AhRE never infers domain relationships.

`code` executes a complete preflight before writing. Postflight formatting, linting, typechecking, tests, coverage, and architecture checks remain deterministic tool execution and reporting, not reasoning.

All significant operations, including failed and blocked operations, are persisted for `inspect last`.

Release artifacts are accepted only after validation from a clean extraction of the final ZIP. Dotfiles are included explicitly.

## Consequences

The CLI surface and operational skills are small. Authoring manifests are more explicit. Incorrect legacy concepts are intentionally incompatible. The engine remains internally composable while responses communicate effects, declared slots, suggestions, and diagnostics without requiring filesystem exploration.
