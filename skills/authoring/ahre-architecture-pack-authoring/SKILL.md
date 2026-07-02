---
name: "AhRE architecture catalog authoring"
description: "Group related executable AhRE capabilities in one filesystem catalog."
---

# AhRE architecture catalog authoring

A pack is only a top-level namespace and distribution directory. Runtime users do not manage packs and public commands do not depend on pack knowledge.

Use this skill when grouping several related capabilities, templates and policies.

```text
packs/<catalog>/
├── pack.json
├── templates/
├── intents/
├── recipes/
└── policies/
```

Rules:

- Follow `ahre-template-authoring` for every executable definition.
- Recipes with an `id` are discovered as public capabilities.
- Keep all references local and explicit.
- Put real generated file trees inside template `files/` directories.
- Do not add catalog-specific branches to AhRE core.
- Use `ahre doctor --json` as the single validation entry point.
- Verify at least one complete `find -> help -> code -> inspect` flow.
