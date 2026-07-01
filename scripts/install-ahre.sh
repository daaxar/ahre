#!/usr/bin/env sh
set -eu

# AhRE user-local installer bootstrap.
# Host this file as GitHub Gist raw or GitHub raw content, then run:
#   curl -fsSL <raw-install-ahre.sh> | sh -s -- --dist-url <raw-ahre-cli.zip> --install-skill
#
# Defaults:
#   install dir: $HOME/.local/.ahre
#   bin dir:     $HOME/.local/bin
#
# The AhRE CLI is intentionally agnostic to this installer.

AHRE_VERSION="0.3.2"
AHRE_DIST_URL="${AHRE_DIST_URL:-}"
AHRE_INSTALL_DIR="${AHRE_INSTALL_DIR:-$HOME/.local/.ahre}"
AHRE_BIN_DIR="${AHRE_BIN_DIR:-$HOME/.local/bin}"
AHRE_INSTALL_SKILL="0"
AHRE_SKIP_DEPS="0"

usage() {
  cat <<USAGE
AhRE installer $AHRE_VERSION

Usage:
  install-ahre.sh --dist-url <zip-url> [options]

Options:
  --dist-url <url>       AhRE ZIP distribution URL. Can also be AHRE_DIST_URL.
  --install-dir <dir>    Install directory. Default: \$HOME/.local/.ahre
  --bin-dir <dir>        Wrapper directory. Default: \$HOME/.local/bin
  --install-skill        Also install AhRE usage SKILL globally after CLI installation.
  --skip-deps            Skip npm install --omit=dev.
  -h, --help             Show help.

Examples:
  curl -fsSL <gist-or-github-raw-install-url> | sh -s -- --dist-url <gist-or-github-raw-zip-url> --install-skill
  AHRE_DIST_URL=<zip-url> sh install-ahre.sh --install-skill
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dist-url)
      AHRE_DIST_URL="$2"; shift 2 ;;
    --install-dir)
      AHRE_INSTALL_DIR="$2"; shift 2 ;;
    --bin-dir)
      AHRE_BIN_DIR="$2"; shift 2 ;;
    --install-skill)
      AHRE_INSTALL_SKILL="1"; shift ;;
    --skip-deps)
      AHRE_SKIP_DEPS="1"; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2 ;;
  esac
done

if [ -z "$AHRE_DIST_URL" ]; then
  echo "AHRE_DIST_URL is required. Pass --dist-url <zip-url>." >&2
  exit 2
fi

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need node
need npm
need unzip

if command -v curl >/dev/null 2>&1; then
  FETCH="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  FETCH="wget -qO-"
else
  echo "Missing required command: curl or wget" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t ahre)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT INT TERM

ZIP_FILE="$TMP_DIR/ahre-cli.zip"
echo "Downloading AhRE from $AHRE_DIST_URL" >&2
# shellcheck disable=SC2086
$FETCH "$AHRE_DIST_URL" > "$ZIP_FILE"

UNPACK_DIR="$TMP_DIR/unpack"
mkdir -p "$UNPACK_DIR"
unzip -q "$ZIP_FILE" -d "$UNPACK_DIR"

PKG_DIR=""
for candidate in "$UNPACK_DIR"/* "$UNPACK_DIR"/*/*; do
  if [ -f "$candidate/package.json" ] && [ -f "$candidate/bin/ahre.mjs" ]; then
    PKG_DIR="$candidate"
    break
  fi
done

if [ -z "$PKG_DIR" ]; then
  echo "Could not find AhRE package inside ZIP." >&2
  exit 1
fi

echo "Installing AhRE into $AHRE_INSTALL_DIR" >&2
rm -rf "$AHRE_INSTALL_DIR"
mkdir -p "$(dirname "$AHRE_INSTALL_DIR")"
cp -R "$PKG_DIR" "$AHRE_INSTALL_DIR"

if [ "$AHRE_SKIP_DEPS" != "1" ]; then
  echo "Installing AhRE runtime dependencies" >&2
  (cd "$AHRE_INSTALL_DIR" && npm install --omit=dev --silent)
fi

mkdir -p "$AHRE_BIN_DIR"
WRAPPER="$AHRE_BIN_DIR/ahre"
cat > "$WRAPPER" <<WRAPPER_EOF
#!/usr/bin/env sh
exec node "$AHRE_INSTALL_DIR/bin/ahre.mjs" "\$@"
WRAPPER_EOF
chmod +x "$WRAPPER"

AHRE_CMD="$WRAPPER"
if command -v ahre >/dev/null 2>&1; then
  AHRE_CMD="ahre"
else
  echo "AhRE was installed, but '$AHRE_BIN_DIR' may not be on PATH yet." >&2
  echo "Add this to your shell profile if needed:" >&2
  echo "  export PATH=\"$AHRE_BIN_DIR:\$PATH\"" >&2
fi

echo "Verifying AhRE" >&2
$AHRE_CMD --version --json >/dev/null

if [ "$AHRE_INSTALL_SKILL" = "1" ]; then
  echo "Installing AhRE usage SKILL globally" >&2
  $AHRE_CMD skill install usage --target global --json >/dev/null
fi

cat <<DONE
AhRE installed successfully.

Install dir:
  $AHRE_INSTALL_DIR

Command:
  $AHRE_CMD

Check:
  $AHRE_CMD --version --json
  $AHRE_CMD skill doctor --target global --json
DONE
