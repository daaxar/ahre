# AhRE CLI v0.6.0

AhRE — ArcHitecture Recipe Engine — is a deterministic CLI for LLM-assisted software development.

The LLM decides intent and business logic. AhRE creates/modifies files, registers inventory, exposes slots, refreshes graph/index, runs quality checks, and returns compact JSON feedback.

## What is new in v0.6.0

- Split installable skills:
  - `.agents/ahre-usage/SKILL.md`
  - `.agents/ahre-generation/SKILL.md`
  - `.agents/ahre-context/SKILL.md`
  - `.agents/ahre-quality/SKILL.md`
- `skill install usage` installs the full operational skill bundle and bootstraps `AGENTS.md`.
- Automatic post-mutation quality pipeline.
- New `quality` namespace.
- Static checks include format, lint, typecheck, architecture verification, and slot integrity.
- Full checks can include tests and coverage.
- Mutating commands return `quality`, `graph`, `logicSlots`, `tasks`, `currentKnowledge`, and `nextForLLM`.

## Install usage skills

```bash
ahre skill install usage --json
```

Creates or updates:

```txt
.agents/ahre-usage/SKILL.md
.agents/ahre-generation/SKILL.md
.agents/ahre-context/SKILL.md
.agents/ahre-quality/SKILL.md
.agents/manifest.json
AGENTS.md
```

## Generate architecture artifacts

```bash
ahre recipe plan entity.capability.ensure \
  --entity User \
  --context Users \
  --json

ahre recipe apply entity.capability.ensure \
  --entity User \
  --context Users \
  --json
```

After `apply`, AhRE returns deterministic `logicSlots` so the LLM knows where business logic belongs without reading generated files first.

## Insert business-specific code into a slot

```bash
ahre slot list --entity Users.User --json
ahre slot get Users.User.create.domainRules --json

ahre code insert-slot \
  --slot Users.User.create.domainRules \
  --content-file ./snippet.ts \
  --json
```

AhRE does not decide the business logic. It only inserts supplied content into a deterministic marker range.

## Automatic quality pipeline

Every mutating command runs `--quality fast` by default.

Fast mode:

- formatter command when configured;
- lint command when configured;
- typecheck command when configured;
- architecture verification;
- slot integrity;
- graph refresh.

Full mode additionally runs tests and coverage when configured:

```bash
ahre recipe apply entity.capability.ensure \
  --entity User \
  --context Users \
  --quality full \
  --json
```

Disable only when explicitly needed:

```bash
ahre code insert-slot \
  --slot Users.User.create.domainRules \
  --content-file ./snippet.ts \
  --quality off \
  --json
```

## Manual quality commands

```bash
ahre quality run --json
ahre quality run --mode full --json
ahre quality static --json
ahre quality format --json
ahre quality lint --json
ahre quality typecheck --json
ahre quality test --json
ahre quality coverage --json
```

`quality` reports are deterministic and compact. Diagnostics can include `tool`, `file`, `line`, `column`, `severity`, `rule`, `message`, and `slot`.

## Project quality configuration

AhRE detects scripts from `package.json` by default. Optional override:

```json
{
  "quality": {
    "defaultMode": "fast",
    "autoRunAfterMutation": true,
    "commands": {
      "format": "npm run format",
      "lint": "npm run lint",
      "typecheck": "npm run typecheck",
      "test": "npm run test:unit",
      "coverage": "npm run coverage"
    }
  }
}
```

Store this at `.ahre/config.json`.

If `package.json`, scripts, or `node_modules` are missing, AhRE returns `SKIPPED` with a reason instead of pretending checks ran.

## Context commands

```bash
ahre slot list --entity Users.User --json
ahre task list --entity Users.User --json
ahre inventory get entity Users.User --json
ahre graph build --json
ahre graph affected src/Users/Domain/Model/User.ts --json
ahre search code User --json
```

Use these before reading generated files.
