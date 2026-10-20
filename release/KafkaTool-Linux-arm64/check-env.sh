#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LIBRARIES_ONLY=false
case "${1:-}" in
  '') ;;
  --libraries-only) LIBRARIES_ONLY=true ;;
  *) echo 'Usage: bash check-env.sh [--libraries-only]' >&2; exit 1 ;;
esac
fail() { echo "ERROR: $*" >&2; exit 1; }
[ "$(uname -s)" = Linux ] || fail 'Linux is required.'
[ "$(uname -m)" = aarch64 ] || fail 'ARM64 (aarch64) is required.'
for tool in getconf sort ldd; do
  command -v "$tool" >/dev/null || fail "Missing system tool: $tool"
done
[ -x "$HERE/bin/KafkaTool" ] || fail 'Executable missing or not executable: bin/KafkaTool'
CURRENT=$(getconf GNU_LIBC_VERSION | awk '{print $2}')
MINIMUM=$(cat "$HERE/min-glibc.txt")
[[ "$CURRENT" =~ ^[0-9]+\.[0-9]+$ && "$MINIMUM" =~ ^[0-9]+\.[0-9]+$ ]] || fail 'Cannot read glibc version.'
[ "$(printf '%s\n' "$CURRENT" "$MINIMUM" | sort -V | tail -n 1)" = "$CURRENT" ] ||
  fail "glibc $CURRENT is older than executable requirement $MINIMUM. Rebuild on an older image; do not replace system glibc."
if ! LINKED=$(ldd "$HERE/bin/KafkaTool" 2>&1); then
  printf '%s\n' "$LINKED" >&2
  fail 'Dynamic library check failed.'
fi
if printf '%s\n' "$LINKED" | grep -Eq 'not found|version .* not found'; then
  printf '%s\n' "$LINKED" >&2
  fail 'Missing/incompatible libraries. See README.txt for matching offline runtime packages.'
fi
# WebKit helpers are not listed in the main executable's ldd output.
WEBKIT_LIB=$(printf '%s\n' "$LINKED" | awk '/libwebkit2gtk-4.0.so/ {print $3; exit}')
[ -n "$WEBKIT_LIB" ] || fail 'Expected WebKit2GTK 4.0 linkage was not found.'
WEBKIT_DIR=''
for base in "$(dirname -- "$WEBKIT_LIB")/webkit2gtk-4.0" /usr/lib/aarch64-linux-gnu/webkit2gtk-4.0 /usr/lib64/webkit2gtk-4.0 /usr/libexec/webkit2gtk-4.0 /usr/lib/webkit2gtk-4.0; do
  if [ -x "$base/WebKitWebProcess" ] && [ -x "$base/WebKitNetworkProcess" ]; then WEBKIT_DIR=$base; break; fi
done
[ -n "$WEBKIT_DIR" ] || fail 'WebKit helper processes were not found. Install the complete matching WebKit2GTK 4.0 runtime.'
for helper in WebKitWebProcess WebKitNetworkProcess; do
  if ! DETAILS=$(ldd "$WEBKIT_DIR/$helper" 2>&1); then
    printf '%s\n' "$DETAILS" >&2
    fail "Cannot check $helper dependencies."
  fi
  if printf '%s\n' "$DETAILS" | grep -q 'not found'; then
    printf '%s\n' "$DETAILS" >&2
    fail "Missing dependencies for $helper."
  fi
done
if ! "$LIBRARIES_ONLY"; then
  [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] || fail 'No graphical session detected. Run from a terminal inside the desktop session.'
fi
echo "Environment checks passed (glibc $CURRENT). This does not replace GUI and Kafka testing."
