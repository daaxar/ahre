---
name: "AhRE Generation"
description: "Discover and execute deterministic code-generation capabilities through the minimal AhRE interface."
---

# AhRE Generation

For normal repository work:

```bash
ahre find "<task>" --json
ahre help <capability> --json
ahre code <capability> [arguments] --json
```

Never invent capability IDs or arguments. Do not inspect internal packs, recipes, intents or templates during normal generation. Use the returned tasks, artifacts, slots, diagnostics and quality report. Use `ahre inspect last --json` when more context is required.

Only load an authoring skill when the user explicitly asks to create or change AhRE definitions.
