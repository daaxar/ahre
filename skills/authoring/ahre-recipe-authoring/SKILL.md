---
name: "ahre-recipe-authoring"
description: "Write and maintain AhRE recipes that compose intents from macro capabilities to micro code operations."
---

# AhRE Recipe Authoring Skill

## Use when

Use this skill only when the user explicitly asks to extend AhRE by creating or modifying recipes.

## Goal

Create declarative, idempotent, composable recipes that converge a repository toward an architectural state.

## Recipe principles

- A recipe represents desired state, not just file creation.
- Recipes must be idempotent.
- Macro recipes may call component recipes and internal intents.
- Execution must be plan/apply friendly.
- Destructive changes require explicit blockers or confirmation.
- Recipes must update semantic inventory.

## Required recipe shape

```yaml
name: "entity.capability.ensure"
kind: "recipe"
visibility: "public"
description: "Ensure an entity capability across layers."
inputs: {}
steps: []
safety:
  idempotent: true
  destructive: false
  requiresPlan: true
effects:
  inventory: []
```

## Anti-patterns

- Recipes that invent business rules.
- Recipes that cannot be safely re-run.
- Recipes that create files without updating inventory.
- Recipes that hide blockers as warnings.
