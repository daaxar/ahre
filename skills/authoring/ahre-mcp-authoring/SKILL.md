---
name: "ahre-mcp-authoring"
description: "Expose AhRE engine capabilities through MCP tools with safe typed inputs, normalized JSON outputs, and no raw shell execution by default."
---

# AhRE MCP Authoring Skill

## Use when

Use this skill only when the user explicitly asks to create or modify an MCP integration for AhRE.

## Goal

Expose AhRE capabilities as safe, typed MCP tools for LLMs.

## Rules

- Prefer semantic MCP tools over raw shell execution.
- Validate all inputs.
- Restrict execution to the configured workspace root.
- Return normalized JSON.
- Preserve AhRE status semantics.
- Do not expose destructive operations without explicit confirmation design.

## Suggested MCP tools

- `ahre_intents_list`
- `ahre_intents_search`
- `ahre_intent_describe`
- `ahre_recipe_plan`
- `ahre_recipe_apply`
- `ahre_code_ensure`
- `ahre_inventory_get`
- `ahre_graph_build`
- `ahre_graph_affected`
- `ahre_build_plan`
- `ahre_search_code`
- `ahre_verify_architecture`
