#!/usr/bin/env bash
# Build on Linux ARM64, preferably the oldest supported Kylin desktop image.
set -euo pipefail
export LC_ALL=C
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
usage() {
  cat <<'EOF'
Usage: bash scripts/build-linux-arm64.sh [--runtime-debs DIRECTORY]
Build on a Linux ARM64 desktop with Go, Node/npm, Wails v2.10.1,
C compiler, pkg-config, GTK3 and WebKit2GTK 4.0 development packages.
Optional DIRECTORY: trusted offline .deb runtime packages for the target OS.
MAX_GLIBC defaults to 2.31; raise only after confirming the target baseline.
EOF
}
RUNTIME_DEBS=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --runtime-debs) [ "$#" -ge 2 ] || { usage; exit 1; }; RUNTIME_DEBS=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac
done
fail() { echo "ERROR: $*" >&2; exit 1; }
[ "$(uname -s)" = Linux ] || fail 'Run this script inside the Kylin Linux ARM64 VM, not macOS.'
[ "$(uname -m)" = aarch64 ] || fail 'A native aarch64 build environment is required.'
for tool in go node npm wails cc pkg-config ldd objdump tar sha256sum getconf sort; do
  command -v "$tool" >/dev/null || fail "Missing build tool: $tool"
done
[ "$(go env GOOS)/$(go env GOARCH)" = linux/arm64 ] || fail 'Remove conflicting GOOS/GOARCH overrides.'
MAX_GLIBC=${MAX_GLIBC:-2.31}
[[ "$MAX_GLIBC" =~ ^[0-9]+\.[0-9]+$ ]] || fail 'MAX_GLIBC must be a version such as 2.31.'
BUILD_GLIBC=$(getconf GNU_LIBC_VERSION | awk '{print $2}')
[ -n "$BUILD_GLIBC" ] || fail 'Cannot determine glibc version.'
[ "$(printf '%s\n' "$BUILD_GLIBC" "$MAX_GLIBC" | sort -V | tail -n 1)" = "$MAX_GLIBC" ] ||
  fail "Build glibc $BUILD_GLIBC exceeds baseline $MAX_GLIBC; use an older build image."
pkg-config --exists gtk+-3.0 webkit2gtk-4.0 || fail 'Install GTK3 and WebKit2GTK 4.0 development packages.'
WAILS_VERSION=$(wails version 2>&1)
[[ "$WAILS_VERSION" == *v2.10.1* ]] || fail 'Use Wails CLI v2.10.1 to match desktop/go.mod.'
if [ -n "$RUNTIME_DEBS" ]; then
  [ -d "$RUNTIME_DEBS" ] || fail 'Runtime package directory does not exist.'
  RUNTIME_DEBS=$(CDPATH= cd -- "$RUNTIME_DEBS" && pwd)
  command -v dpkg-deb >/dev/null || fail 'dpkg-deb is required to validate supplied .deb packages.'
  shopt -s nullglob
  DEBS=("$RUNTIME_DEBS"/*.deb)
  [ "${#DEBS[@]}" -gt 0 ] || fail 'No .deb files found.'
  for deb in "${DEBS[@]}"; do
    arch=$(dpkg-deb -f "$deb" Architecture)
    [[ "$arch" = arm64 || "$arch" = all ]] || fail "Wrong package architecture: $deb ($arch)"
  done
fi
# Go 1.23 supports GOARM64=v8.0. Keep the baseline ISA; avoid CPU-specific tuning.
export GOOS=linux GOARCH=arm64 GOARM64=v8.0 CGO_ENABLED=1
cd "$ROOT/frontend"
npm ci
cd "$ROOT/desktop"
wails build -platform linux/arm64 -skipbindings -clean
BIN="$ROOT/desktop/build/bin/KafkaTool"
[ -f "$BIN" ] || fail "Missing build output: $BIN"
mkdir -p "$ROOT/release"
STAGE=$(mktemp -d "$ROOT/release/.linux-arm64.XXXXXX")
trap 'rm -rf -- "$STAGE"' EXIT
NAME=KafkaTool-Linux-arm64
PACKAGE="$STAGE/$NAME"
mkdir -p "$PACKAGE/bin"
cp "$BIN" "$PACKAGE/bin/KafkaTool"
cp "$ROOT/scripts/linux/launch.sh" "$PACKAGE/launch.sh"
cp "$ROOT/scripts/linux/check-env.sh" "$PACKAGE/check-env.sh"
cp "$ROOT/scripts/linux/README.txt" "$PACKAGE/README.txt"
chmod +x "$PACKAGE/bin/KafkaTool" "$PACKAGE/launch.sh" "$PACKAGE/check-env.sh"
# Record actual symbol requirement, including compatibility with linked libraries separately.
objdump -T "$BIN" > "$STAGE/symbols.txt"
MIN_GLIBC=$(awk '{for(i=1;i<=NF;i++) if ($i ~ /GLIBC_[0-9]/) {v=$i; gsub(/[^0-9.]/,"",v); print v}}' "$STAGE/symbols.txt" | sort -V | tail -n 1)
[ -n "$MIN_GLIBC" ] || fail 'Cannot determine executable glibc requirement.'
printf '%s\n' "$MIN_GLIBC" > "$PACKAGE/min-glibc.txt"
{
  echo "Built at (UTC): $(date -u +%FT%TZ)"
  echo "Target: linux/arm64; GOARM64=v8.0"
  echo "Build glibc: $BUILD_GLIBC; executable GLIBC symbols: $MIN_GLIBC"
  go version
  node --version
  echo "$WAILS_VERSION"
  pkg-config --modversion gtk+-3.0 webkit2gtk-4.0
  [ ! -f /etc/os-release ] || cat /etc/os-release
  echo '--- Build-host linked libraries (not bundled) ---'
  ldd "$BIN"
} > "$PACKAGE/build-info.txt"
if [ -n "$RUNTIME_DEBS" ]; then
  mkdir -p "$PACKAGE/runtime-debs"
  cp "${DEBS[@]}" "$PACKAGE/runtime-debs/"
fi
# Fail before publishing if required linked libraries are missing on the build host.
bash "$PACKAGE/check-env.sh" --libraries-only
(cd "$PACKAGE" && find . -type f ! -name SHA256SUMS -exec sha256sum {} + > SHA256SUMS)
tar -C "$STAGE" -czf "$STAGE/$NAME.tar.gz" "$NAME"
mv "$STAGE/$NAME.tar.gz" "$ROOT/release/$NAME.tar.gz"
(cd "$ROOT/release" && sha256sum "$NAME.tar.gz" > "$NAME.tar.gz.sha256")
echo "Created: $ROOT/release/$NAME.tar.gz"
echo 'Build checks passed. GUI/Kafka acceptance tests are still required on Linux and on site.'
