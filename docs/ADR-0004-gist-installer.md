# ADR-0004 — Minimal external raw installer for AhRE CLI

## Status

Accepted

## Context

AhRE needs a low-friction installation path for users and LLM-assisted environments. The desired user experience is:

```bash
curl -fsSL <raw-install-ahre.sh> | sh
```

No extra parameters should be required. The CLI must remain agnostic to distribution and must not expose installer commands.

## Decision

AhRE ships a standalone external shell script at `scripts/install-ahre.sh`.

Before publishing, the maintainer embeds `AHRE_SOURCE_URL` in the script. The source can be either a raw ZIP URL or a Git repository URL. The script installs AhRE into:

```txt
$HOME/.local/.ahre
$HOME/.local/bin/ahre
```

The installer also installs the user-facing AhRE usage skill globally by default, so LLMs can discover how to use AhRE after installation.

AhRE CLI does not expose any installer command.

## Consequences

- Users get a single-command install path.
- The CLI remains focused on architecture recipes, code intents, inventory, graph, search, build planning, verification, and skills.
- The installer can be hosted from GitHub Gist raw or GitHub raw.
- The published installer must contain an embedded source URL.
- Maintainers can still override paths/source with environment variables for tests.

## Alternatives Considered

- Require `--dist-url` as an argument.
  - Rejected: too much friction for the target install experience.
- Add `ahre installer` commands.
  - Rejected: installer concerns do not belong to the CLI command surface.
- Use npm global only.
  - Rejected: less portable for agent environments and requires package publication.
