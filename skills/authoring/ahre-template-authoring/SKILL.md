---
name: "AhRE capability and template authoring"
description: "Create executable filesystem capabilities, recipes, intents, and templates without modifying AhRE core."
---

# AhRE capability and template authoring

Use this skill only when creating or changing AhRE generation definitions.

## Objective

Add a capability that can be discovered with `ahre find`, documented with `ahre help`, executed with `ahre code`, and validated with `ahre doctor`.

Do not add capability-specific generation code to `src/ahre-cli.mjs`.

## Filesystem contract

A bundled architecture catalog lives under:

```text
packs/<catalog>/
├── pack.json
├── templates/
│   └── <template-id>/
│       ├── template.json
│       └── files/
│           └── <real template tree>
├── intents/
│   └── <intent-id>.json
├── recipes/
│   └── <recipe-id>.json
└── policies/
```

The public capability is declared by a recipe. The recipe composes intents. Each intent references one template. A template renders one or more real files.

```text
public capability recipe
  -> ordered tasks
    -> intent
      -> template
        -> files
```

## 1. Create the template

Use one directory per template:

```text
templates/entity.aggregate/
├── template.json
└── files/
    └── src/Context/Domain/Model/Entity.ts.tpl
```

`template.json` must declare an exact source-to-target mapping:

```json
{
  "name": "entity.aggregate",
  "description": "DDD aggregate and identifier.",
  "variables": ["context", "entity"],
  "files": [
    {
      "source": "files/src/Context/Domain/Model/Entity.ts.tpl",
      "target": "src/{{context}}/Domain/Model/{{entity}}.ts"
    }
  ]
}
```

Rules:

- `source` is relative to the template directory.
- `target` is relative to the execution root.
- Every `{{variable}}` used by source content or target must be listed in `variables`.
- Store actual generated content under `files/`; never use placeholder documentation files such as `generated/<name>.txt`.
- A template may create several files.
- Preserve the target repository directory shape inside `files/` when practical so humans can navigate it.
- Templates create structure and extension slots, not invented business rules.
- Never silently overwrite an existing different file.

## 2. Add deterministic slots when business code is expected

Use paired markers:

```ts
// AHRE_SLOT_START:{{context}}.{{entity}}.create.domainRules
// Put aggregate creation invariants here.
// AHRE_SLOT_END:{{context}}.{{entity}}.create.domainRules
```

A slot ID must be stable, semantic, unique, and derived only from input variables. The text between markers must explain what belongs there without deciding the business rule.

## 3. Create the intent

An intent is a small deterministic reference to one template:

```json
{
  "name": "entity.ensure",
  "description": "Ensure aggregate and identifier.",
  "template": "entity.aggregate"
}
```

Do not duplicate rendering logic in the intent.

## 4. Create the public recipe

A recipe becomes a public capability when it has an `id`:

```json
{
  "name": "entity.capability.ensure",
  "id": "entity.create",
  "description": "Ensure an entity create capability across all layers.",
  "aliases": ["create entity", "entity endpoint"],
  "tags": ["entity", "aggregate", "controller"],
  "required": ["entity", "context"],
  "example": "ahre code entity.create --entity Order --context Orders --json",
  "tasks": [
    { "id": "aggregate", "intent": "entity.ensure" },
    { "id": "usecase", "intent": "usecase.command.ensure" }
  ]
}
```

Rules:

- `id` is the exact public capability used by `ahre code`.
- `name` is the internal recipe identifier.
- `required` lists exact CLI flags without `--`.
- `example` must be executable.
- Every task references an existing intent.
- Task order is execution order.
- Composition stays declarative; do not call shell commands from templates.

## 5. Validate and smoke-test

Run:

```bash
ahre doctor --json
ahre find "<task words>" --json
ahre help <capability-id> --json
ahre code <capability-id> <required arguments> --json
ahre inspect last --json
```

Verify:

- `doctor` reports no unknown template or intent references.
- `find` returns the capability ID.
- `help` shows required arguments and the exact example.
- `code` creates the declared targets.
- the response lists tasks, created/existing/conflicting files, slots, graph and quality.
- a second identical execution is idempotent.
- no generated capability requires editing AhRE core.

## Failure conditions

Stop and fix the definition when:

- a template source is missing;
- a target uses an undeclared variable;
- an intent references an unknown template;
- a recipe task references an unknown intent;
- a public recipe has no example or required-argument contract;
- generated source is only documentation or a stub unrelated to its target;
- `code` still routes through capability-specific hardcoded generation.
