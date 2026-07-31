#!/bin/sh

set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
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

wails build -platform windows/amd64 -skipbindings
cp "$DESKTOP_DIR/build/bin/KafkaTool.exe" "$RELEASE_DIR/KafkaTool-Windows-x64.exe"

echo "Build complete:"
echo "  $RELEASE_DIR/KafkaTool-macOS-arm64.dmg"
echo "  $RELEASE_DIR/KafkaTool-Windows-x64.exe"
