# Installing AhRE from a GitHub Gist

AhRE can be distributed with a tiny installer hosted as a GitHub Gist raw file.

The recommended Gist contains at least two files:

```txt
install-ahre.sh
ahre-cli-v0.3.1.zip
```

## User command

```bash
curl -fsSL https://gist.githubusercontent.com/<owner>/<gist-id>/raw/install-ahre.sh \
  | sh -s -- \
      --dist-url https://gist.githubusercontent.com/<owner>/<gist-id>/raw/ahre-cli-v0.3.1.zip \
      --install-skill
```

This installs the CLI for the current user and optionally installs the AhRE usage SKILL globally.

## Installer modes

Default mode:

```bash
--method user-bin
```

Installs AhRE into:

```txt
~/.ahre/cli/current
```

and creates a wrapper at:

```txt
~/.local/bin/ahre
```

NPM global mode:

```bash
--method npm-global
```

Runs:

```bash
npm install -g <unpacked-ahre-package>
```

Use this only when the user's Node/npm global prefix is configured correctly.

## Environment variables

```bash
AHRE_DIST_URL=<zip-url>
AHRE_INSTALL_DIR=~/.ahre/cli/current
AHRE_BIN_DIR=~/.local/bin
AHRE_METHOD=user-bin
```

## Creating the Gist

1. Export the installer:

```bash
ahre installer export --to ./dist/install-ahre.sh
```

2. Package the CLI ZIP:

```bash
zip -qr ahre-cli-v0.3.1.zip ahre-cli
```

3. Upload both files to a GitHub Gist.

4. Share the curl command above.

## Why the installer does not hardcode a Gist URL

The same installer can be reused across private and public Gists. The ZIP location is passed with `--dist-url` or `AHRE_DIST_URL`, so the installer remains portable.
