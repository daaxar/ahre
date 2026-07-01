# Install AhRE with curl pipe sh

AhRE uses a minimal external installer. The CLI remains agnostic to the installer.

## User command

```bash
curl -fsSL https://raw.githubusercontent.com/daaxar/ahre/main/scripts/install-ahre.sh | sh
```

## Installer behavior

The installer does exactly this:

1. Downloads:

```txt
https://github.com/daaxar/ahre/archive/refs/heads/main.zip
```

2. Unzips it into:

```txt
$HOME/.local/.ahre
```

3. Enters:

```txt
$HOME/.local/.ahre/ahre-main
```

4. Runs:

```bash
npm install
npm install -g .
```

5. Verifies:

```bash
ahre --version --json
```

## Notes

- The installer has no CLI flags.
- The installer is not an AhRE command.
- AhRE does not know how it was installed.
- `npm install -g .` uses the user's npm global configuration.
- If the global npm prefix is not writable, npm will report the error directly.
