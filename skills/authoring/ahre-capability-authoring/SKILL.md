---
name: "AhRE capability pack authoring"
description: "Create composable AhRE capability packs without recipes, intents or separate template registries."
---

# AhRE capability pack authoring

A pack is a distribution namespace containing capabilities. Do not create `recipes/`, `intents/` or `templates/` registries.

```text
packs/<pack>/
├── pack.json
├── capabilities/
│   └── <capability id as folders>/
│       ├── capability.json
│       └── files/
└── policies/
```

For `entity.create`, use `capabilities/entity/create/capability.json`.

A capability may declare:

- `requires`: indispensable capabilities executed automatically.
- `files`: deterministic templates owned by this capability.
- `suggests`: optional follow-ups returned to the LLM and never auto-executed.
- `alternatives`: selectable implementations or transports.
- `required`: CLI variables.
- `targetRoot`: optional rendered execution root.

## Non-negotiable minimal-generation rule

A capability MUST generate only artifacts required for its declared result to be complete.

Do not generate an artifact merely because it is common or may be useful later. Generic DDD capabilities MUST NOT force HTTP, Express, consumers, MongoDB, SQL, PDF, XLSX, messaging, security, logging or runtime files.

Put indispensable composition in `requires`. Put common but non-universal additions in `suggests`. Put mutually selectable choices in `alternatives`.

Before accepting a capability, verify:

1. Every generated file is necessary in 100% of valid uses of that capability.
2. No transport or persistence technology is imposed by a generic domain/application capability.
3. Optional infrastructure appears only in `suggests` or `alternatives`.
4. Each dependency in `requires` is truly indispensable.
5. The capability is idempotent and never silently overwrites different content.
6. The response will clearly expose created files, dependency execution, slots, quality and optional next capabilities.

Example:

```json
{
  "id": "context.ddd",
  "required": ["context"],
  "files": [
    { "source": "files/Domain/.gitkeep.tpl", "target": "src/{{context}}/Domain/.gitkeep" },
    { "source": "files/Application/.gitkeep.tpl", "target": "src/{{context}}/Application/.gitkeep" }
  ],
  "suggests": [
    { "capability": "controller.http", "when": "Expose a use case over HTTP." },
    { "capability": "repository.mongo", "when": "Use MongoDB persistence." }
  ]
}
```

Validate with `ahre doctor --json`, then test `ahre find`, `ahre help`, `ahre code` and `ahre inspect last`.
