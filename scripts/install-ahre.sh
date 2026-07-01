#!/usr/bin/env sh
set -eu

# AhRE installer bootstrap.
# Intended to be hosted as a GitHub Gist raw file and executed with:
#   curl -fsSL https://gist.githubusercontent.com/<owner>/<gist-id>/raw/install-ahre.sh | sh -s -- --dist-url https://gist.githubusercontent.com/<owner>/<gist-id>/raw/ahre-cli-v0.3.1.zip --install-skill
#
# Environment overrides:
#   AHRE_DIST_URL      URL to the AhRE ZIP distribution.
#   AHRE_INSTALL_DIR   Install directory. Default: $HOME/.ahre/cli/current
#   AHRE_BIN_DIR       Directory for the global wrapper. Default: $HOME/.local/bin
#   AHRE_METHOD        user-bin | npm-global. Default: user-bin

AHRE_VERSION="0.3.1"
AHRE_DIST_URL="${AHRE_DIST_URL:-}"
AHRE_INSTALL_DIR="${AHRE_INSTALL_DIR:-$HOME/.ahre/cli/current}"
AHRE_BIN_DIR="${AHRE_BIN_DIR:-$HOME/.local/bin}"
AHRE_METHOD="${AHRE_METHOD:-user-bin}"
AHRE_INSTALL_SKILL="0"
AHRE_SKIP_DEPS="0"

usage() {
  cat <<USAGE
AhRE installer $AHRE_VERSION

Usage:
  install-ahre.sh --dist-url <zip-url> [options]

Options:
  --dist-url <url>       AhRE ZIP distribution URL. Can also be AHRE_DIST_URL.
  --install-dir <dir>    Install directory for user-bin mode. Default: ~/.ahre/cli/current
  --bin-dir <dir>        Global wrapper directory for user-bin mode. Default: ~/.local/bin
  --method <method>      user-bin | npm-global. Default: user-bin
  --install-skill        Also install AhRE usage SKILL globally after CLI installation.
  --skip-deps            Skip npm install --omit=dev in user-bin mode.
  -h, --help             Show help.

Examples:
  curl -fsSL <gist-raw-install-url> | sh -s -- --dist-url <gist-raw-zip-url> --install-skill
  AHRE_DIST_URL=<gist-raw-zip-url> sh install-ahre.sh --install-skill
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
    --method)
      AHRE_METHOD="$2"; shift 2 ;;
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

case "$AHRE_METHOD" in
  npm-global)
    echo "Installing AhRE globally with npm from $PKG_DIR" >&2
    npm install -g "$PKG_DIR"
    ;;
  user-bin)
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
    ;;
  *)
    echo "Unknown install method: $AHRE_METHOD" >&2
    exit 2
    ;;
esac

if ! command -v ahre >/dev/null 2>&1; then
  if [ "$AHRE_METHOD" = "user-bin" ]; then
    echo "AhRE was installed, but 'ahre' is not on PATH yet." >&2
    echo "Add this to your shell profile:" >&2
    echo "  export PATH=\"$AHRE_BIN_DIR:\$PATH\"" >&2
    AHRE_CMD="$AHRE_BIN_DIR/ahre"
  else
    echo "AhRE install finished, but 'ahre' is not visible on PATH." >&2
    AHRE_CMD="ahre"
  fi
else
  AHRE_CMD="ahre"
fi

echo "Verifying AhRE" >&2
$AHRE_CMD --version --json >/dev/null

if [ "$AHRE_INSTALL_SKILL" = "1" ]; then
  echo "Installing AhRE usage SKILL globally" >&2
  $AHRE_CMD skill install usage --target global --json >/dev/null
fi

cat <<DONE
AhRE installed successfully.

Command:
  $AHRE_CMD

Check:
  $AHRE_CMD --version --json
  $AHRE_CMD skill doctor --target global --json
DONE
