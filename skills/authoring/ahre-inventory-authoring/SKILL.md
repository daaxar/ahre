---
name: "ahre-inventory-authoring"
description: "Maintain AhRE semantic inventory and dependency graph as regenerable caches for LLM context, build planning, and architecture verification."
---

# AhRE Inventory Authoring Skill

## Use when

Use this skill only when the user explicitly asks to modify AhRE inventory, graph, cache, or context models.

## Goal

Maintain inventory and graph data as compact, regenerable context for LLMs and build planning.

## Rules

- Source code is the source of truth.
- Inventory is a semantic cache.
- Graph is a dependency/cache-planning cache.
- Inventory must be rebuildable.
- Stale inventory must be detectable.
- Keep responses compact and structured.

## Inventory should track

- contexts
- entities
- methods
- capabilities
- repositories
- controllers
- consumers
- events
- tests
- structured TODOs
- operations

## Anti-patterns

- Treating inventory as authoritative when code disagrees.
- Storing huge source snippets in inventory.
- Updating files without updating semantic relationships.
