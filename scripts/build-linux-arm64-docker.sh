#!/usr/bin/env bash
# Run from macOS (or Linux); build tools and source changes stay in the container.
set -euo pipefail
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
IMAGE=kafka-tool-linux-arm64-builder:local
CLEAN=false
case "${1:-}" in
  '') ;;
  --clean) CLEAN=true ;;
  -h|--help)
    echo 'Usage: bash scripts/build-linux-arm64-docker.sh [--clean]'
    echo 'Requires running Docker. Outputs release/KafkaTool-Linux-arm64.tar.gz.'
    echo '--clean removes this build image after success (shared Docker cache may remain).'
    exit 0 ;;
  *) echo 'Unknown option. Use --help.' >&2; exit 1 ;;
esac
[ "$#" -le 1 ] || { echo 'Too many arguments.' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Docker is required. Install and start Docker Desktop.' >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo 'Docker is unavailable. Start Docker Desktop and retry.' >&2; exit 1; }
mkdir -p "$ROOT/release"
echo 'Preparing Linux ARM64 build tools (first run downloads dependencies)...'
docker build --platform linux/arm64 -t "$IMAGE" -f "$ROOT/scripts/linux/Dockerfile" "$ROOT/scripts/linux"
echo 'Building in a temporary container; only release/ is mounted from your Mac...'
# Copy source instead of mounting the checkout: Linux npm packages and generated
# files must not replace the macOS development dependencies or build output.
# macOS metadata is unnecessary in Linux and makes GNU tar emit warnings.
TAR_OPTIONS=()
if [ "$(uname -s)" = Darwin ]; then
  export COPYFILE_DISABLE=1
  TAR_OPTIONS=(--no-xattrs --no-acls --no-fflags)
fi
tar "${TAR_OPTIONS[@]}" -C "$ROOT" \
  --exclude=.git --exclude=node_modules --exclude=release \
  --exclude=dist --exclude=desktop/build/bin --exclude=.DS_Store \
  -cf - . | docker run --rm -i --platform linux/arm64 \
    --mount "type=bind,source=$ROOT/release,target=/work/release" \
    "$IMAGE" bash -c 'tar -xf - -C /work && bash /work/scripts/build-linux-arm64.sh'
if "$CLEAN"; then
  docker image rm "$IMAGE"
fi
echo "Created: $ROOT/release/KafkaTool-Linux-arm64.tar.gz"
echo 'Verify the package on your target Kylin ARM64 desktop before deployment.'
