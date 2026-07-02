---
name: "AhRE intent authoring"
description: "Connect one deterministic AhRE operation to one executable filesystem template."
---

# AhRE intent authoring

Read `ahre-template-authoring` first. An intent is declarative JSON under `packs/<catalog>/intents/` and normally contains `name`, `description`, and `template`. It must reference an existing template and must not contain capability-specific execution code. Validate with `ahre doctor --json`.
