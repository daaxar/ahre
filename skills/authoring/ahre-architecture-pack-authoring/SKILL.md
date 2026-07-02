---
name: "AhRE filesystem pack authoring"
description: "Create simple AhRE packs from folders containing templates, intents, recipes, and policies."
---

# AhRE filesystem pack authoring

Use this skill only when creating or changing an AhRE pack.

Start with:

```bash
ahre pack init my-pack --json
ahre pack validate my-pack --json
```

A pack is only a directory namespace:

```text
packs/my-pack/
├── pack.json
├── templates/
│   └── entity/
│       ├── template.json
│       └── files/
├── intents/
├── recipes/
└── policies/
```

Rules:

- Put real template files under `templates/<id>/files/`.
- Declare source-to-target mappings in `template.json`.
- An intent references a template and deterministic options.
- A recipe contains ordered tasks referencing intents or other recipes.
- Never add pack-specific execution code to AhRE core.
- Run `ahre pack validate <pack>` after every change.
