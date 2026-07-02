---
name: "AhRE Quality"
description: "Interpret automatic deterministic quality feedback returned after AhRE mutations."
---

# AhRE Quality

Every mutating `ahre code` command runs the configured post-mutation pipeline automatically. It may format files and execute lint, typecheck, architecture, slot-integrity, tests, and coverage checks according to project configuration.

Trust the returned `quality` report. Fix the exact normalized diagnostic reported by file, line, column, rule, and slot. Run `ahre doctor --json` for installation/definition health. Advanced compatibility quality commands exist, but they are not part of the normal workflow.
