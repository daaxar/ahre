# ADR-0015: Unified minimal capabilities

## Decision

Architecture packs expose only capabilities. Recipes, intents and template registries are removed from pack authoring. A capability owns its templates and composes other capabilities with `requires`. Optional additions use `suggests` and `alternatives`.

Generic capabilities generate only artifacts necessary in every valid use. Transport, persistence, consumers, documents, messaging, security and runtime adapters are optional unless intrinsic to the capability.
