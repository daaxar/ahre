# AhRE 0.9.0

AhRE is a deterministic capability engine for LLM-assisted software development. The LLM chooses what to build; AhRE validates inputs and project preconditions, composes declared capabilities, creates files, exposes declared slots, runs deterministic postflight checks, and reports exactly what happened.

## Public CLI

AhRE exposes only:

```bash
ahre list --json
ahre find "<query>" --json
ahre help [capability] --json
ahre code <capability> [named flags] --json
ahre inspect [last|subject] --json
ahre doctor --json
```

All commands support `--json`. Removed concepts are not accepted as commands.

## Typical workflow

```bash
ahre list --tag http --json
ahre find "http service" --json
ahre help service.http --json
ahre code service.http --service orders --quality off --json
ahre inspect last --json
```

`find` searches only declared `id`, `aliases`, `tags`, and `description`. A `PARTIAL` result must not be treated as a complete match.

## Capability structure

```text
packs/<catalog>/
├── pack.json
├── capabilities/
│   └── controller/http/command/
│       ├── capability.json
│       └── files/
└── policies/
```

A capability declares arguments, required composition, optional suggestions, alternatives, preconditions, generated files, and slots. It must generate only what is universally necessary for its declared purpose.

## Preflight and postflight

Before writing files, `ahre code` validates named arguments, naming rules, sources, target conflicts, dependencies, TypeScript configuration, and required artifacts declared by the capability. Failed preflight returns `BLOCKED` and writes nothing.

After mutation, AhRE runs its configured formatter/linter/typecheck/test pipeline when available. `--quality off` disables postflight tools for deterministic release smoke tests; it does not disable preflight.

## Operation history

Searches, blocked commands, invalid arguments, preflight failures, mutations, and quality failures are written under `.ahre/`. Recover the latest operation with:

```bash
ahre inspect last --json
```

## Authoring

See `skills/authoring/ahre-capability-authoring/SKILL.md`. AhRE does not infer capability relationships. Authors declare `requires`, `suggests`, and `alternatives` explicitly.

## Release validation

```bash
npm run check
npm test
npm run release:verify
```

`release:verify` creates the ZIP and validates a clean extraction with the required `doctor`, `list`, `find`, `help`, `code`, and `inspect` smoke sequence.
