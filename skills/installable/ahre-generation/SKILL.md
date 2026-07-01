---
name: "AhRE Generation"
description: "Use AhRE intents, recipes, and deterministic code modification commands for architecture/code generation and slot edits."
---

# AhRE Generation

Use this skill when creating or modifying architecture/code artifacts.

## Do not invent recipe names

Discover or confirm the command first:

```bash
ahre intents search "<task>" --json
ahre intents describe <intent> --json
ahre recipe list --json
ahre recipe describe <recipe> --json
```

## Main generation commands

```bash
ahre recipe plan architecture.service.ensure --service <service> --json
ahre recipe apply architecture.service.ensure --service <service> --json

ahre recipe plan bounded-context.ensure --context <Context> --json
ahre recipe apply bounded-context.ensure --context <Context> --json

ahre recipe plan entity.capability.ensure --entity <Entity> --context <Context> --json
ahre recipe apply entity.capability.ensure --entity <Entity> --context <Context> --json
```

## Micro modification commands

```bash
ahre ensure value-object --context <Context> --name <Name> --json
ahre ensure domain-event --context <Context> --event <EventName> --json
ahre ensure method --entity <Entity> --context <Context> --method <methodName> --json
ahre code insert-slot --slot <slotId> --content-file <file> --json
```

AhRE does not decide business logic. For business-specific code, use the slot ids returned by AhRE or query them with the context skill.

## After mutation

Every mutating command returns a `quality` report. Trust it. Do not manually run external format/lint/typecheck/tests unless AhRE reports a check as `SKIPPED` or the user asks for deeper verification.
