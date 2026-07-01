---
name: "ahre-intent-authoring"
description: "Implement AhRE executable intents with idempotent plan/apply behavior, AST-safe edits, and structured JSON reports."
---

# AhRE Intent Authoring Skill

## Use when

Use this skill only when the user explicitly asks to extend AhRE with executable intents.

## Goal

Implement low-level and component-level operations that recipes can compose safely.

## Required intent contract

Every intent must define:

- name
- kind
- description
- inputs
- idempotency behavior
- plan behavior
- apply behavior
- inventory effects
- blockers and warnings
- JSON output shape

## Status semantics

Intent result statuses:

- `OK`
- `NOOP`
- `PARTIAL`
- `BLOCKED`
- `FAILED`

Step statuses:

- `CREATED`
- `EXISTS`
- `PATCHED`
- `UPDATED`
- `SKIPPED`
- `WARNING`
- `BLOCKED`
- `FAILED`

## Rules

- Use AST edits for TypeScript where possible.
- Use text patching only as a conservative fallback.
- Never silently overwrite user code.
- Return compact JSON for LLM consumption.
- Update inventory and graph hints when relevant.
