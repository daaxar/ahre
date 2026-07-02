# ADR-0012: Simple filesystem packs

## Status
Accepted

## Decision

AhRE v0.7 treats a pack as a top-level directory. A pack contains `pack.json` and the sibling directories `templates`, `intents`, `recipes`, and `policies`. Templates are directories containing `template.json` plus a real file tree under `files/`. Intents and recipes are small JSON files that reference existing IDs.

The CLI discovers packs from `packs/`, `.ahre/packs/`, and bundled `packs/`. Developers can create a complete example with `ahre pack init <name>` and validate references with `ahre pack validate <name>`.

## Consequences

- Authoring does not require modifying AhRE core.
- File paths are visible in the directory tree.
- Templates can emit multiple files.
- Packs are merely a namespace and distribution boundary.
