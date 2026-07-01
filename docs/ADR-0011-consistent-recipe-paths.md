# ADR-0011: Consistent recipe plan/apply path reporting

## Status
Accepted

## Context
`architecture.service.ensure` planned files relative to the repository root (`servs/<service>/...`) but reported apply effects relative to the generated service root (`package.json`, `src/index.ts`, etc.). This confused agents because plan/apply appeared to describe different targets.

The service baseline plan also omitted files created by the actual apply path, such as shared value object bases, message queue/security/logging adapters, Jest config, and Cucumber world placeholder.

## Decision
`architecture.service.ensure` now uses a single deterministic baseline file list for both plan and apply.

For service workspace creation, plan and apply effect paths are reported relative to the repository root and include:

- `pathBase: repository-root`
- `serviceRoot: servs/<service>`

Quality still runs from the service root, so `quality.changedFiles` remains service-root-relative.

Follow-up recipe suggestions include `--root <serviceRoot>` so agents continue operating inside the generated service workspace without guessing paths.

## Consequences
Agents can compare `wouldCreate` and `effects.created` directly.

The LLM no longer needs to inspect the filesystem to determine whether AhRE created files in `/workspace` or `/workspace/servs/<service>`.
