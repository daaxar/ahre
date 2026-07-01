# Install AhRE with curl pipe sh

AhRE should be installable with a single command:

```bash
curl -fsSL <raw-install-ahre.sh> | sh
```

The installer is intentionally external to the CLI. AhRE itself does not expose installer commands.

## Publishing the installer

Before publishing `scripts/install-ahre.sh`, replace the embedded `AHRE_SOURCE_URL` value with either:

1. a raw ZIP URL, for example a GitHub Gist raw URL or GitHub raw/release asset; or
2. a Git repository URL that can be cloned.

Example embedded source values:

```sh
AHRE_SOURCE_URL="${AHRE_SOURCE_URL:-https://gist.githubusercontent.com/<owner>/<gist-id>/raw/ahre-cli-v0.3.3.zip}"
```

or:

```sh
AHRE_SOURCE_URL="${AHRE_SOURCE_URL:-https://github.com/<owner>/<repo>.git}"
```

Once the URL is embedded, users install with no extra parameters:

```bash
curl -fsSL https://gist.githubusercontent.com/<owner>/<gist-id>/raw/install-ahre.sh | sh
```

## Default installation paths

The installer always uses user-local global paths by default:

```txt
$HOME/.local/.ahre
$HOME/.local/bin/ahre
```

It also installs the user-facing AhRE usage skill globally by default:

```txt
$HOME/.ahre/skills/ahre-usage/SKILL.md
$HOME/.ahre/skills/manifest.json
```

Set `AHRE_INSTALL_SKILL=0` only if you explicitly want to skip global skill installation.

## Environment overrides for maintainers

Normal users should not need these. They are useful for CI or local tests:

```bash
AHRE_SOURCE_URL=file:///tmp/ahre-cli-v0.3.3.zip sh scripts/install-ahre.sh
AHRE_INSTALL_DIR=/tmp/ahre AHRE_BIN_DIR=/tmp/bin AHRE_SOURCE_URL=file:///tmp/ahre-cli-v0.3.3.zip sh scripts/install-ahre.sh
AHRE_SKIP_DEPS=1 AHRE_SOURCE_URL=file:///tmp/ahre-cli-v0.3.3.zip sh scripts/install-ahre.sh
```

No CLI arguments are required or documented as the normal path.
