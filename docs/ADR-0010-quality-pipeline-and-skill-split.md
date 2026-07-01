# ADR-0010: Quality pipeline and operational skill split

## Status

Accepted.

## Context

AhRE gained more commands for generation, slots, inventory, graph, and quality. A single usage skill would become too large and would dilute the mandatory rule: use AhRE before manual code work.

Also, formatting, linting, typechecking, architecture checks, and other static feedback should be commodity behavior after deterministic file mutation. The LLM should not have to remember to run external tools or parse large logs.

## Decision

Split installable operational skills into:

- `ahre-usage`: mandatory entrypoint and router;
- `ahre-generation`: intents, recipes, and deterministic code/slot mutation;
- `ahre-context`: slots, tasks, inventory, graph, and search before file reads;
- `ahre-quality`: format, lint, typecheck, tests, coverage, diagnostics.

Add an automatic post-mutation quality pipeline. Mutating commands run `quality fast` by default, refresh graph/index where possible, and return a compact deterministic `quality` report.

## Consequences

Agents get a small mandatory entrypoint and load specialized guidance only when needed.

AhRE remains deterministic: it measures and reports quality; the LLM decides how to fix issues and where business logic belongs.
