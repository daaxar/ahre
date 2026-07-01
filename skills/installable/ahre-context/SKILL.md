---
name: "AhRE Context"
description: "Use AhRE inventory, slots, tasks, graph, and search before reading generated files."
---

# AhRE Context

Use this skill when the model needs to know what exists, where logic belongs, what changed, or what is affected.

## Rule

Do not inspect generated files first. Query AhRE context surfaces first.

## Slots

```bash
ahre slot list --entity <Context.Entity> --json
ahre slot get <slotId> --json
```

Use slots to locate exact file/class/method/marker for business-specific logic.

## Tasks

```bash
ahre task list --entity <Context.Entity> --json
ahre task next --json
ahre task get <taskId> --json
```

Tasks are deterministic recipe work items. They tell the LLM what AhRE already did and which manual work is available.

## Inventory, graph, search

```bash
ahre inventory get entity <Context.Entity> --json
ahre inventory list entities --json
ahre graph build --json
ahre graph get file <path> --json
ahre graph affected <path> --json
ahre search code <query> --json
```

Use graph and affected files to scope checks and edits. Read source files only when AhRE context is insufficient or actual business-specific code must be edited.
