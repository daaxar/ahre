# ms-expeditions-clean-ddd

This pack contains only composable **capabilities**.

Each directory under `capabilities/` contains `capability.json` and optional real templates under `files/`.

- `requires`: executed automatically because they are indispensable.
- `suggests`: returned to the LLM but never executed automatically.
- `alternatives`: related mutually selectable capabilities.
- `files`: deterministic file mappings.

Generic capabilities MUST NOT require transport, persistence, consumers, documents or runtime adapters unless those concerns are intrinsic to the capability.
