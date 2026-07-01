# ADR-0004 — Gist-hosted installer for AhRE CLI

## Status

Accepted

## Context

AhRE needs a low-friction installation path for users and LLM-assisted environments. Users should be able to download a tiny installer from a GitHub Gist and install the CLI globally without manually cloning the repository.

## Decision

AhRE ships a POSIX shell installer at `scripts/install-ahre.sh`. The installer is designed to be hosted as a GitHub Gist raw file and receives the distribution ZIP URL through `--dist-url` or `AHRE_DIST_URL`.

The installer supports two modes:

- `user-bin`: installs into `~/.ahre/cli/current` and creates a wrapper in `~/.local/bin/ahre`.
- `npm-global`: runs `npm install -g` from the unpacked package.

The default is `user-bin` because it avoids `sudo`, avoids global npm prefix issues, and remains easy to inspect/remove.

## Consequences

- The installer remains portable across public/private Gists.
- The actual distribution ZIP can move independently from the installer script.
- Users may need to add `~/.local/bin` to `PATH`.
- AhRE can optionally install the usage SKILL globally during bootstrap with `--install-skill`.

## Alternatives Considered

- Hardcode a Gist URL in the installer.
  - Pros: shorter user command.
  - Cons: less portable, awkward for forks/private installs.

- Only use `npm install -g`.
  - Pros: standard Node workflow.
  - Cons: global npm permissions/prefixes are often messy.

- Embed the full CLI in the installer.
  - Pros: single file.
  - Cons: huge script, poor diffability, ugly to audit.

## Related Skills

- ahre-usage
- ahre-intent-authoring
- ahre-mcp-authoring
