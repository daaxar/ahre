# Installing AhRE from GitHub Gist or GitHub raw

AhRE is installed by a small external shell script. The CLI is intentionally agnostic to the installer and does not expose installer commands.

## Files to host

Host both files in a GitHub Gist or in a repository reachable through raw GitHub URLs:

```txt
install-ahre.sh
ahre-cli-v0.3.2.zip
```

## Install from GitHub Gist raw

```bash
curl -fsSL https://gist.githubusercontent.com/<owner>/<gist-id>/raw/install-ahre.sh \
  | sh -s -- \
      --dist-url https://gist.githubusercontent.com/<owner>/<gist-id>/raw/ahre-cli-v0.3.2.zip \
      --install-skill
```

## Install from GitHub raw

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/<ref>/install-ahre.sh \
  | sh -s -- \
      --dist-url https://raw.githubusercontent.com/<owner>/<repo>/<ref>/ahre-cli-v0.3.2.zip \
      --install-skill
```

## Defaults

The installer uses user-local global paths by default:

```txt
$HOME/.local/.ahre
$HOME/.local/bin/ahre
```

It creates a wrapper at `$HOME/.local/bin/ahre` pointing to `$HOME/.local/.ahre/bin/ahre.mjs`.

If `$HOME/.local/bin` is not on PATH, the installer prints the shell export to add.

## Options

```bash
--dist-url <url>       AhRE ZIP distribution URL. Can also be AHRE_DIST_URL.
--install-dir <dir>    Install directory. Default: $HOME/.local/.ahre
--bin-dir <dir>        Wrapper directory. Default: $HOME/.local/bin
--install-skill        Also install the AhRE usage SKILL globally.
--skip-deps            Skip npm install --omit=dev.
```

## Design note

The installer belongs to distribution. AhRE CLI remains focused on architecture recipes, code intents, inventory, graph, build planning, search, verification, and SKILL installation.
