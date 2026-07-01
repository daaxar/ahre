# ADR-0004 — External raw installer for AhRE CLI

## Status

Accepted

## Context

AhRE needs a low-friction installation path for users and LLM-assisted environments. Users should be able to download a small installer from GitHub Gist raw or GitHub raw and install the CLI globally for the current user.

The installer should not become part of the AhRE command surface. The CLI must stay focused on architecture automation, not on distributing itself.

## Decision

AhRE ships an external POSIX shell script at `scripts/install-ahre.sh`. The script can be hosted as a GitHub Gist raw file or GitHub repository raw file.

The installer receives the AhRE ZIP URL through `--dist-url` or `AHRE_DIST_URL`. It installs AhRE into:

```txt
$HOME/.local/.ahre
```

and creates a wrapper at:

```txt
$HOME/.local/bin/ahre
```

AhRE CLI does not expose an `installer` command.

## Consequences

- The CLI remains installer-agnostic.
- Installation is simple and user-local by default.
- The same script works from GitHub Gist raw and GitHub raw URLs.
- Distribution can evolve without adding CLI commands.
- The user may need to add `$HOME/.local/bin` to PATH.

## Alternatives Considered

- Add `ahre installer` commands.
  - Pros: discoverable from CLI.
  - Cons: pollutes AhRE command surface with distribution concerns. Rejected.

- Use npm global installation only.
  - Pros: standard Node pattern.
  - Cons: depends on npm global prefix permissions and configuration. Rejected as default.

- Hardcode a Gist URL in the installer.
  - Pros: simpler command.
  - Cons: not portable across public/private distribution. Rejected.
