# AhRE CLI v0.4.1

AhRE — ArcHitecture Recipe Engine — is a CLI and recipe engine for architecture-first development with coding agents.

It provides:

- architecture recipes;
- composable intents from macro capabilities to micro code edits;
- templates;
- semantic inventory;
- dependency graph/build planning;
- code search;
- installable agent skills;
- architecture packs.

## Install

The installer is intentionally external to the CLI. AhRE itself stays installer-agnostic.

Expected install command:

```bash
curl -fsSL https://raw.githubusercontent.com/daaxar/ahre/main/scripts/install-ahre.sh | sh
```

The installer downloads:

```txt
https://github.com/daaxar/ahre/archive/refs/heads/main.zip
```

Then it extracts into:

```txt
$HOME/.local/.ahre
```

and runs:

```bash
cd $HOME/.local/.ahre/ahre-main
npm install
npm install -g .
```

## Mandatory agent bootstrap

Install the usage skill in a project:

```bash
ahre skill install usage --json
```

By default this writes:

```txt
.agents/ahre-usage/SKILL.md
.agents/manifest.json
AGENTS.md
```

If `AGENTS.md` already exists, AhRE appends or updates an idempotent block delimited by:

```txt
<!-- AHRE_USAGE_SKILL_START -->
<!-- AHRE_USAGE_SKILL_END -->
```

The generated `AGENTS.md` block is intentionally strict. It tells isolated coding agents that AhRE is the mandatory first execution path before manually writing code or architecture artifacts.

Agents must read `.agents/ahre-usage/SKILL.md` and then use AhRE first for:

- bounded contexts;
- entities/aggregates;
- value objects;
- repositories;
- use cases;
- controllers;
- consumers;
- domain events;
- tests;
- DI bindings;
- runtime/config skeletons;
- architecture folders.

Manual work is only a fallback when AhRE is unavailable, returns `BLOCKED`, lacks an applicable intent/recipe, or leaves business-specific TODOs.

To install into another folder:

```bash
ahre skill install usage --to ./custom-agents --json
```

To avoid touching `AGENTS.md`:

```bash
ahre skill install usage --no-agents-md --json
```

## Typical agent workflow

```bash
ahre intents search "entity create http mongo" --json
ahre intents describe entity.capability.ensure --json
ahre recipe plan entity.capability.ensure --entity User --context Users --json
ahre recipe apply entity.capability.ensure --entity User --context Users --json
ahre inventory get entity Users.User --json
ahre graph build --json
ahre verify architecture --json
```

## Architecture pack

v0.4 includes the `ms-expeditions-clean-ddd` architecture pack derived from the project architecture document.

```bash
ahre pack list --json
ahre template list --json
ahre recipe list --json
ahre recipe describe architecture.service.ensure --json
```

### Ensure a service workspace

```bash
ahre recipe plan architecture.service.ensure --service ms-expeditions --json
ahre recipe apply architecture.service.ensure --service ms-expeditions --json
```

### Ensure a bounded context

```bash
ahre recipe apply bounded-context.ensure \
  --context Expeditions \
  --root servs/ms-expeditions \
  --json
```

### Ensure an entity capability

```bash
ahre recipe apply entity.capability.ensure \
  --entity Expedition \
  --context Expeditions \
  --root servs/ms-expeditions \
  --json
```

### Ensure a consumer

```bash
ahre recipe apply consumer.event.ensure \
  --context Expeditions \
  --event PackageWasScanned \
  --usecase UpdateExpeditionsFromPackageScanned \
  --root servs/ms-expeditions \
  --json
```

## Code namespace

```bash
ahre code capability --entity User --context Users --json
ahre code method --entity User --context Users --method changeEmail --json
```

## Inventory and graph

```bash
ahre inventory get entity Users.User --json
ahre inventory list entities --json
ahre graph build --json
ahre graph affected src/Users/Domain/Model/User.ts --json
ahre build plan --changed src/Users/Domain/Model/User.ts --json
ahre search code User --json
```

## Verify

```bash
ahre verify architecture --json
```

## Skill commands

```bash
ahre skill list --json
ahre skill list --all --json
ahre skill show usage --json
ahre skill install usage --json
ahre skill doctor --json
```

Authoring skills are not installed by default:

```bash
ahre skill show authoring.recipe --json
ahre skill install authoring.recipe --allow-authoring-skills --json
```

## Development checks

```bash
npm run check
```
