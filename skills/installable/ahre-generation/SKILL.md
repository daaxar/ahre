---
name: "AhRE Capability Authoring"
description: "Create or extend filesystem capabilities used internally by the minimal AhRE code command."
---

# AhRE Capability Authoring

Use only when creating or extending AhRE definitions.

A public capability is invoked with:

```bash
ahre code <capability> [arguments] --json
```

Definitions may compose other definitions, render file trees, expose slots, create tasks, and declare checks. Keep the filesystem navigable and metadata declarative. Runtime users should not need to know whether a definition is internally a recipe, intent, template, or pack.

Validate all installed definitions with:

```bash
ahre doctor --json
```
