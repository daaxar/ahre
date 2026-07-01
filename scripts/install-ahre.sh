#!/usr/bin/env sh
set -eu

# AhRE one-command installer.
#
# Intended usage after publishing this script with an embedded source URL:
#   curl -fsSL <raw-install-ahre.sh> | sh
#
# Before publishing, set AHRE_SOURCE_URL below to either:
#   - a raw ZIP URL, for example a GitHub Gist raw file or GitHub raw/release asset
#   - a Git repository URL that can be cloned
#
# Optional environment overrides are supported for maintainers/CI, but normal users
# should not need arguments or flags.

AHRE_VERSION="0.3.3"

# Replace this value in the published installer. Keeping it as a variable makes
# the CLI distribution agnostic to where the installer is hosted.
AHRE_SOURCE_URL="${AHRE_SOURCE_URL:-__AHRE_SOURCE_URL__}"

# Default user-global install locations.
AHRE_INSTALL_DIR="${AHRE_INSTALL_DIR:-$HOME/.local/.ahre}"
AHRE_BIN_DIR="${AHRE_BIN_DIR:-$HOME/.local/bin}"
AHRE_BIN_PATH="$AHRE_BIN_DIR/ahre"

# Install the user-facing AhRE skill globally by default. Set AHRE_INSTALL_SKILL=0
# to skip when testing the installer.
AHRE_INSTALL_SKILL="${AHRE_INSTALL_SKILL:-1}"

# Set AHRE_SKIP_DEPS=1 only for local tests where dependencies are already known
# to be unavailable or unnecessary.
AHRE_SKIP_DEPS="${AHRE_SKIP_DEPS:-0}"

info() { printf '%s\n' "$*" >&2; }
fail() { printf 'AhRE installer error: %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

fetch_to_file() {
  url="$1"
  dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    fail "missing required command: curl or wget"
  fi
}

if [ "$AHRE_SOURCE_URL" = "__AHRE_SOURCE_URL__" ] || [ -z "$AHRE_SOURCE_URL" ]; then
  cat >&2 <<MSG
AhRE installer has no embedded source URL.

Publish a copy of scripts/install-ahre.sh with AHRE_SOURCE_URL set to a raw ZIP
URL or a Git repository URL. Then users can install with:

  curl -fsSL <raw-install-ahre.sh> | sh

For local testing only, you may run:

  AHRE_SOURCE_URL=file:///path/to/ahre-cli-v$AHRE_VERSION.zip sh scripts/install-ahre.sh
MSG
  exit 2
fi

need node
need npm

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t ahre)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT INT TERM

PKG_DIR=""
case "$AHRE_SOURCE_URL" in
  *.zip|*.zip\?*|file://*.zip)
    need unzip
    ZIP_FILE="$TMP_DIR/ahre-cli.zip"
    info "Downloading AhRE $AHRE_VERSION from ZIP source"
    fetch_to_file "$AHRE_SOURCE_URL" "$ZIP_FILE"
    UNPACK_DIR="$TMP_DIR/unpack"
    mkdir -p "$UNPACK_DIR"
    unzip -q "$ZIP_FILE" -d "$UNPACK_DIR"
    for candidate in "$UNPACK_DIR"/* "$UNPACK_DIR"/*/*; do
      if [ -f "$candidate/package.json" ] && [ -f "$candidate/bin/ahre.mjs" ]; then
        PKG_DIR="$candidate"
        break
      fi
    done
    ;;
  *)
    need git
    info "Cloning AhRE $AHRE_VERSION from Git source"
    git clone --depth 1 "$AHRE_SOURCE_URL" "$TMP_DIR/repo" >/dev/null 2>&1 || fail "git clone failed"
    if [ -f "$TMP_DIR/repo/package.json" ] && [ -f "$TMP_DIR/repo/bin/ahre.mjs" ]; then
      PKG_DIR="$TMP_DIR/repo"
    elif [ -f "$TMP_DIR/repo/ahre-cli/package.json" ] && [ -f "$TMP_DIR/repo/ahre-cli/bin/ahre.mjs" ]; then
      PKG_DIR="$TMP_DIR/repo/ahre-cli"
    fi
    ;;
esac

[ -n "$PKG_DIR" ] || fail "could not locate AhRE package in source"

info "Installing AhRE into $AHRE_INSTALL_DIR"
rm -rf "$AHRE_INSTALL_DIR"
mkdir -p "$(dirname "$AHRE_INSTALL_DIR")"
cp -R "$PKG_DIR" "$AHRE_INSTALL_DIR"

if [ "$AHRE_SKIP_DEPS" != "1" ]; then
  info "Installing runtime dependencies"
  (cd "$AHRE_INSTALL_DIR" && npm install --omit=dev --silent)
fi

mkdir -p "$AHRE_BIN_DIR"
cat > "$AHRE_BIN_PATH" <<WRAPPER
#!/usr/bin/env sh
exec node "$AHRE_INSTALL_DIR/bin/ahre.mjs" "\$@"
WRAPPER
chmod +x "$AHRE_BIN_PATH"

info "Verifying AhRE"
"$AHRE_BIN_PATH" --version --json >/dev/null

if [ "$AHRE_INSTALL_SKILL" = "1" ]; then
  info "Installing AhRE usage skill globally"
  "$AHRE_BIN_PATH" skill install usage --target global --json >/dev/null || info "Could not install global skill; CLI installation still completed"
fi

cat <<DONE
AhRE $AHRE_VERSION installed successfully.

CLI:
  $AHRE_BIN_PATH

Install dir:
  $AHRE_INSTALL_DIR

Try:
  ahre --version --json
  ahre skill doctor --target global --json

If 'ahre' is not found, add this to your shell profile:
  export PATH="$AHRE_BIN_DIR:\$PATH"
DONE
