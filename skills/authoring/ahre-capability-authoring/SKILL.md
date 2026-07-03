---
name: "AhRE Capability Authoring"
description: "Create deterministic filesystem capabilities with explicit arguments, relations, preconditions, files, slots, and minimal generation."
---

# AhRE Capability Authoring

Create a capability at:

```text
packs/<catalog>/capabilities/<id-as-folders>/
├── capability.json
└── files/
```

For `controller.http.command`, use:

```text
capabilities/controller/http/command/
```

Do not create recipe, intent, or template registries. A capability is the single authoring concept.

## Required manifest contract

Every capability must declare:

```json
{
  "id": "controller.http.command",
  "description": "Create an HTTP adapter for an existing command use case.",
  "aliases": ["http command controller"],
  "tags": ["http", "controller", "command"],
  "arguments": {
    "context": {
      "required": true,
      "type": "identifier",
      "case": "PascalCase",
      "description": "Bounded context name.",
      "example": "Auth"
    }
  },
  "requires": [],
  "suggests": [],
  "alternatives": {},
  "preconditions": [],
  "files": [],
  "slots": [],
  "usage": "ahre code controller.http.command --context <Context> --json",
  "example": "ahre code controller.http.command --context Auth --json"
}
```

## Deterministic relations

AhRE does not infer relationships.

- `requires`: indispensable capabilities executed first.
- `suggests`: optional capabilities communicated but never executed automatically.
- `alternatives`: declared choices communicated without selection.
- Never duplicate inverse relationships such as `requiredBy`; they are calculated in memory.

## Minimal-generation rule

A capability must create only artifacts necessary in 100% of its valid uses.

Do not generate files merely because they are common. Generic domain/application capabilities must not force HTTP, persistence, consumers, messaging, documents, security, logging, or runtime components. Put common non-universal additions in `suggests` or `alternatives`.

## Arguments and naming

- Declare every variable used by file targets, file contents, preconditions, and slots.
- Use named flags only.
- Declare `type`, `case`, `description`, and `example`.
- Ensure the example contains every required flag.
- Prefer visible normalization only when deterministic; otherwise block invalid input.

## Preconditions

Declare environmental and artifact requirements explicitly:

```json
{
  "preconditions": [
    { "type": "package", "name": "routing-controllers" },
    { "type": "tsconfig", "property": "experimentalDecorators", "equals": true },
    { "type": "artifact", "kind": "application.usecase", "path": "src/{{context}}/Application/UseCase/{{usecase}}/{{usecase}}.ts" }
  ]
}
```

Preflight must complete before any file is written.

## Slots

Declare slot semantics in the manifest. Markers only locate the range.

```json
{
  "slots": [
    {
      "id": "{{context}}.{{controller}}.transportMapping",
      "file": "src/{{context}}/Infrastructure/UI/Controller/{{controller}}.ts",
      "kind": "transport-mapping",
      "purpose": "Map the HTTP request into the application use-case input."
    }
  ]
}
```

## Validation workflow

```bash
ahre doctor --json
ahre list --json
ahre find "<metadata terms>" --json
ahre help <capability> --json
ahre code <capability> <all required flags> --quality off --json
ahre inspect last --json
```

Do not add capability-specific behavior to the core. Add or modify only declarative manifests and files unless extending the generic engine itself.
