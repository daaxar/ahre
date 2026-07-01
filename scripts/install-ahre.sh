#!/usr/bin/env sh
set -eu

# AhRE minimal installer.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/daaxar/ahre/main/scripts/install-ahre.sh | sh
#
# What it does:
#   1. Downloads https://github.com/daaxar/ahre/archive/refs/heads/main.zip
#   2. Unzips it into $HOME/.local/.ahre
#   3. Enters $HOME/.local/.ahre/ahre-main
#   4. Runs npm install
#   5. Runs npm install -g .

AHRE_ZIP_URL="https://github.com/daaxar/ahre/archive/refs/heads/main.zip"
AHRE_INSTALL_ROOT="$HOME/.local/.ahre"
AHRE_ARCHIVE="$AHRE_INSTALL_ROOT/main.zip"
AHRE_SOURCE_DIR="$AHRE_INSTALL_ROOT/ahre-main"

info() { printf '%s\n' "$*" >&2; }
fail() { printf 'AhRE installer error: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"; }

need curl
need unzip
need node
need npm

info "Installing AhRE from $AHRE_ZIP_URL"
info "Install root: $AHRE_INSTALL_ROOT"

mkdir -p "$AHRE_INSTALL_ROOT"
rm -rf "$AHRE_SOURCE_DIR" "$AHRE_ARCHIVE"

info "Downloading AhRE main.zip"
curl -fsSL "$AHRE_ZIP_URL" -o "$AHRE_ARCHIVE"

info "Unpacking into $AHRE_INSTALL_ROOT"
unzip -q "$AHRE_ARCHIVE" -d "$AHRE_INSTALL_ROOT"

[ -d "$AHRE_SOURCE_DIR" ] || fail "expected source directory not found: $AHRE_SOURCE_DIR"
[ -f "$AHRE_SOURCE_DIR/package.json" ] || fail "package.json not found in $AHRE_SOURCE_DIR"

info "Installing npm dependencies"
(cd "$AHRE_SOURCE_DIR" && npm install)

info "Installing AhRE globally with npm"
(cd "$AHRE_SOURCE_DIR" && npm install -g .)

info "Verifying AhRE command"
command -v ahre >/dev/null 2>&1 || fail "ahre command was not found after npm install -g ."
ahre --version --json >/dev/null 2>&1 || fail "ahre command did not run successfully"

cat <<DONE
AhRE installed successfully.

Source:
  $AHRE_SOURCE_DIR

Try:
  ahre --version --json
  ahre skill install usage --target global --json

DONE
