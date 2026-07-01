---
name: "ahre-template-authoring"
description: "Write AhRE templates for deterministic code generation with placeholders, inventory metadata, TODO markers, and architecture-safe defaults."
---

# AhRE Template Authoring Skill

## Use when

Use this skill only when the user explicitly asks to create or modify AhRE templates.

## Goal

Create deterministic templates that generate architecture-safe skeletons without inventing business behavior.

## Rules

- Templates generate structure, not domain truth.
- Use explicit placeholders.
- Add structured `ARCH_TODO` markers for unknown business logic.
- Keep imports layer-safe.
- Keep generated files testable.
- Ensure every template can be used idempotently by an intent.

## Structured TODO example

```ts
// ARCH_TODO[id={{todoId}} kind=domain-invariant artifact={{Context}}.{{Entity}}.create]
// Define creation invariants.
```

## Anti-patterns

- Hardcoded business validations.
- Random naming or non-deterministic output.
- Templates that require manual formatting to compile.
- Templates that leak infrastructure into domain code.
