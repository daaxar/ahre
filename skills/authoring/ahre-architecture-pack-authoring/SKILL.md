---
name: "ahre-architecture-pack-authoring"
description: "Create and maintain AhRE architecture packs that bundle templates, recipes, intents and policies for a concrete architecture."
---

## Use when

Use this skill only when extending AhRE itself with a new architecture pack or modifying an existing pack.

## Rules

- Architecture packs are not installed in user projects as LLM usage skills.
- A pack must declare templates, recipes, intents and policies separately.
- Public recipes express desired architectural capabilities, not single-file generation.
- Intents must be idempotent and report created, updated, existing, blocked and warnings.
- Templates must generate safe skeletons and structured `ARCH_TODO` markers instead of inventing business rules.
- The semantic inventory must be updated by every apply operation.

## Required shape

```txt
architecture-packs/<pack-name>/
├── pack.json
├── policies/
├── templates/
├── recipes/
└── intents/
```

## Acceptance checklist

- The pack can be listed with `ahre pack list --json`.
- Recipes can be listed/described with `ahre recipe list --json`.
- Templates can be listed/described with `ahre template list --json`.
- At least one public recipe can be planned and applied.
