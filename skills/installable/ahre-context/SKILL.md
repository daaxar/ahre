---
name: "AhRE Inspection"
description: "Inspect AhRE results and repository knowledge without scanning generated files first."
---

# AhRE Inspection

Use the consolidated inspection interface:

```bash
ahre inspect last --json
ahre inspect <entity-or-capability> --json
```

The response may include artifacts, slots, tasks, dependency graph information, diagnostics, and recent operations. Read files only when the returned context is insufficient for the required business-specific edit.
