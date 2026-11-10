#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

build_mac() (
  DESKTOP_DIR="$PROJECT_DIR/desktop"
  RELEASE_DIR="$PROJECT_DIR/release"
  DMG_STAGING_DIR=$(mktemp -d /private/tmp/kafkatool-dmg.XXXXXX)

  cleanup() {
    rm -rf "$DMG_STAGING_DIR"
  }
  trap cleanup EXIT

  mkdir -p "$RELEASE_DIR"

  cd "$DESKTOP_DIR"
  wails build \
    -platform darwin/arm64 \
    -clean \
    -ldflags=-extldflags=-Wl,-framework,UniformTypeIdentifiers

  ditto "$DESKTOP_DIR/build/bin/KafkaTool.app" "$RELEASE_DIR/KafkaTool-macOS-arm64.app"
  codesign --force --deep --sign - "$RELEASE_DIR/KafkaTool-macOS-arm64.app"
  ditto "$RELEASE_DIR/KafkaTool-macOS-arm64.app" "$DMG_STAGING_DIR/KafkaTool.app"
  ln -s /Applications "$DMG_STAGING_DIR/Applications"
  hdiutil create \
    -volname KafkaTool \
    -srcfolder "$DMG_STAGING_DIR" \
    -ov \
    -format UDZO \
    "$RELEASE_DIR/KafkaTool-macOS-arm64.dmg"

  echo "Build complete: $RELEASE_DIR/KafkaTool-macOS-arm64.dmg"
)

usage() {
  echo 'Usage: sh scripts/build-apps.sh [mac|window|arm|all]'
  echo '  mac     Build macOS ARM64 DMG only'
  echo '  window  Build Windows x64 offline installer only'
  echo '  arm     Build Linux ARM64 using Docker only'
  echo '  all     Build all three platforms (default)'
}

[ "$#" -le 1 ] || { usage >&2; exit 1; }
TARGET=${1:-all}
case "$TARGET" in
  -h|--help) usage; exit 0 ;;
  mac|window|windows|arm|all) ;;
  *) echo "Unknown target: $TARGET" >&2; usage >&2; exit 1 ;;
esac

case "$TARGET" in
  mac) build_mac ;;
  window|windows) sh "$PROJECT_DIR/scripts/build-windows.sh" ;;
  arm) bash "$PROJECT_DIR/scripts/build-linux-arm64-docker.sh" ;;
  all)
    build_mac
    sh "$PROJECT_DIR/scripts/build-windows.sh"
    bash "$PROJECT_DIR/scripts/build-linux-arm64-docker.sh"
    ;;
esac
