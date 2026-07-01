# ADR-0005 — Minimal GitHub main installer

## Status

Accepted

## Context

AhRE needs a simple user-facing installation flow. Previous iterations added too much installer logic and exposed installer behavior as a CLI concern.

The desired user experience is:

```bash
curl -fsSL <installer-url> | sh
```

without parameters.

## Decision

The installer is a plain shell script hosted in the repository and is not part of the AhRE command surface.

It downloads:

```txt
https://github.com/daaxar/ahre/archive/refs/heads/main.zip
```

Then it unpacks into:

```txt
$HOME/.local/.ahre
```

Then it enters:

```txt
$HOME/.local/.ahre/ahre-main
```

And runs:

```bash
npm install
npm install -g .
```

## Consequences

- AhRE stays installer-agnostic.
- The installer is easy to audit.
- The install command has no extra parameters.
- The installed version tracks the `main` branch.
- npm global prefix/permission behavior is delegated to npm.

## Alternatives Considered

- Parameterized installer with `--dist-url` and install modes.
  - Rejected because it was more flexible than needed.
- CLI subcommands for installer generation.
  - Rejected because installation is not an AhRE runtime responsibility.
- User-local wrapper without `npm install -g .`.
  - Rejected because the requested flow explicitly uses npm global installation.
