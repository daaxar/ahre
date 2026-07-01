# AhRE CLI — ArcHitecture Recipe Engine

AhRE is a CLI-first architecture automation engine for LLM-assisted development.

It executes composable, idempotent intents that converge a repository toward a desired architectural state, then returns compact JSON with effects, inventory, graph, and current semantic knowledge.

The CLI is designed for repositories that use Clean Architecture, Hexagonal Architecture, DDD, CQRS, event-driven messaging, explicit dependency injection, and monorepo boundaries.

## What AhRE does

AhRE is not just a file generator.

It provides:

- macro recipes;
- component recipes;
- micro-intents;
- AST-aware TypeScript edits with `ts-morph` when installed;
- conservative fallback patching;
- semantic inventory;
- dependency graph;
- build-impact planning;
- code search;
- architecture verification;
- installable LLM usage skill;
- non-default authoring skills for extending AhRE itself.

## Install dependencies

```bash
npm install
```

`ts-morph` is declared as a dependency. Without it, AhRE still works for many operations but reports when it falls back to conservative text patching.

## Installing from a GitHub Gist

AhRE includes a Gist-friendly installer script. The installer itself can be hosted in a GitHub Gist and install the CLI globally for the current user.

Export the installer script:

```bash
node ./bin/ahre.mjs installer export --to ./dist/install-ahre.sh --json
```

Host these files in the same Gist:

```txt
install-ahre.sh
ahre-cli-v0.3.1.zip
```

Then users can install with:

```bash
curl -fsSL https://gist.githubusercontent.com/<owner>/<gist-id>/raw/install-ahre.sh   | sh -s --       --dist-url https://gist.githubusercontent.com/<owner>/<gist-id>/raw/ahre-cli-v0.3.1.zip       --install-skill
```

By default, the installer uses user-local global installation:

```txt
~/.ahre/cli/current
~/.local/bin/ahre
```

It can also use npm global installation:

```bash
curl -fsSL <gist-install-url>   | sh -s -- --dist-url <gist-zip-url> --method npm-global
```

See `docs/INSTALL_FROM_GIST.md` for details.

## Basic commands

```bash
node ./bin/ahre.mjs --version --json
node ./bin/ahre.mjs intents list --json
node ./bin/ahre.mjs intents search "entity create http mongo" --json
node ./bin/ahre.mjs intents describe entity.capability.ensure --json
```

## Recipe plan/apply

Plan first:

```bash
node ./bin/ahre.mjs recipe plan entity.capability.ensure \
  --entity User \
  --context Users \
  --json
```

Apply:

```bash
node ./bin/ahre.mjs recipe apply entity.capability.ensure \
  --entity User \
  --context Users \
  --json
```

The recipe ensures, when missing:

- context folders;
- `AggregateRoot`;
- base `Uuid` value object;
- aggregate/entity skeleton;
- id value object;
- repository interface;
- create use case;
- HTTP controller;
- Mongo repository skeleton;
- domain event skeleton;
- unit/API test skeletons;
- DI placeholder;
- semantic inventory.

## Code namespace

The `code` namespace is a LLM-friendly alias over recipe and ensure operations.

```bash
node ./bin/ahre.mjs code capability --entity User --context Users --json
node ./bin/ahre.mjs code method --entity User --context Users --method changeEmail --params "email: UserEmail" --returns void --json
```

## Inventory

AhRE maintains `.ahre/inventory.json` as a semantic cache.

```bash
node ./bin/ahre.mjs inventory get entity Users.User --json
node ./bin/ahre.mjs inventory list entities --json
node ./bin/ahre.mjs inventory rebuild --json
```

Inventory is not the source of truth. Source code is. Inventory exists to give LLMs compact context.

## Dependency graph and build planning

Build the graph:

```bash
node ./bin/ahre.mjs graph build --json
```

Inspect a file node:

```bash
node ./bin/ahre.mjs graph get file src/Users/Domain/Model/User.ts --json
```

List affected files:

```bash
node ./bin/ahre.mjs graph affected src/Users/Domain/Model/User.ts --json
```

Plan build impact:

```bash
node ./bin/ahre.mjs build plan --changed src/Users/Domain/Model/User.ts --json
```

This version does not execute compilation yet. It calculates impacted files and preliminary cache keys.

## Search

```bash
node ./bin/ahre.mjs search code User --json
node ./bin/ahre.mjs search code changeEmail --json
```

Search uses graph and inventory context.

## Verify architecture

```bash
node ./bin/ahre.mjs verify architecture --json
```

Current checks include low-cost import rules for Domain/Application layers and cross-boundary relative import hints.

## LLM Skill installation

AhRE bundles a user-facing SKILL for LLMs. This skill teaches the model how to use AhRE, not how to modify AhRE internals.

List installable skills:

```bash
node ./bin/ahre.mjs skill list --json
```

List all bundled skills, including non-default authoring skills:

```bash
node ./bin/ahre.mjs skill list --all --json
```

Show the usage skill:

```bash
node ./bin/ahre.mjs skill show usage --json
```

Install the usage skill into the current project:

```bash
node ./bin/ahre.mjs skill install usage --target project --json
```

This creates:

```txt
.ahre/skills/ahre-usage/SKILL.md
.ahre/skills/manifest.json
```

Run doctor:

```bash
node ./bin/ahre.mjs skill doctor --target project --json
```

Supported targets:

- `project` → `.ahre/skills`
- `global` → `~/.ahre/skills`
- `path` → explicit `--path` or `--to`
- `claude` → `.claude/skills`
- `codex` → `.codex/skills`
- `opencode` → `.opencode/skills`

## Authoring skills

AhRE also bundles authoring skills for developers extending AhRE itself:

- `authoring.recipe`
- `authoring.template`
- `authoring.intent`
- `authoring.inventory`
- `authoring.mcp`

These are **not installed by default**.

Show one:

```bash
node ./bin/ahre.mjs skill show authoring.recipe --json
```

Export one:

```bash
node ./bin/ahre.mjs skill export authoring.recipe --to ./docs/skills --json
```

Installing authoring skills requires an explicit flag:

```bash
node ./bin/ahre.mjs skill install authoring.recipe \
  --target project \
  --allow-authoring-skills \
  --json
```

This friction is intentional. Normal project users need the AhRE usage skill, not framework-authoring instructions.

## Recommended LLM integration

Preferred integration stack:

```txt
AGENTS.md      → governs pipeline and gates
AhRE SKILL     → teaches when/how to use AhRE
MCP server     → exposes AhRE as typed tools, when available
AhRE CLI       → portable execution backend and fallback
Inventory      → compact semantic context
Graph          → dependency/build context
```

Execution preference for models:

1. Use AhRE MCP tools if available.
2. Otherwise use AhRE CLI with `--json`.
3. Otherwise implement manually using project architecture skills and report the gap.

## Version

Current version: `0.3.1`.
