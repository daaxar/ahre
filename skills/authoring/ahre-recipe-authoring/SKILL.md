---
name: "AhRE recipe authoring"
description: "Compose executable intents into a public or internal deterministic capability."
---

# AhRE recipe authoring

Read `ahre-template-authoring` first. A recipe is declarative JSON under `packs/<catalog>/recipes/`.

Use `id` only when the recipe must be publicly discoverable through `ahre find`, `ahre help`, and `ahre code`. Compose existing intents through ordered `tasks`. Do not implement rendering or business decisions in recipes. Validate with `ahre doctor --json` and smoke-test the public command twice for idempotency.
