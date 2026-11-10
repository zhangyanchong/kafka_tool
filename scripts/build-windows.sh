#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CACHE_DIR="$PROJECT_DIR/.cache/webview2"
VERSION=156.0.4314.58
CAB="$CACHE_DIR/Microsoft.WebView2.FixedVersionRuntime.$VERSION.x64.cab"
URL="https://msedge.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/b7919cc9-680d-4253-bf32-732988e68aa6/Microsoft.WebView2.FixedVersionRuntime.$VERSION.x64.cab"
command -v makensis >/dev/null 2>&1 || { echo "Please install NSIS (macOS: brew install nsis)" >&2; exit 1; }
mkdir -p "$CACHE_DIR" "$PROJECT_DIR/release"
if [ ! -s "$CAB" ]; then
  curl -fL --retry 3 "$URL" -o "$CAB.part"
  mv "$CAB.part" "$CAB"
fi
python3 - "$CAB" <<'CHECK'
import hashlib
from pathlib import Path
import sys
expected = "857dcfd6f7035508a29645fa2978c3a6a841f220df77cc366d318894e19f4792"
with Path(sys.argv[1]).open("rb") as stream:
    if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
        raise SystemExit("WebView2 CAB checksum mismatch; remove cached CAB and retry")
CHECK
STAGING=$(mktemp -d "$CACHE_DIR/package.XXXXXX")
trap 'rm -rf "$STAGING"' EXIT
mkdir -p "$STAGING/extracted" "$STAGING/KafkaTool-Windows-x64"
# macOS bsdtar supports CAB; Linux builds need bsdtar (libarchive-tools).
if command -v bsdtar >/dev/null 2>&1; then
  bsdtar -xf "$CAB" -C "$STAGING/extracted"
else
  tar -xf "$CAB" -C "$STAGING/extracted"
fi
RUNTIME=$(find "$STAGING/extracted" -name msedgewebview2.exe -type f -print)
if [ -z "$RUNTIME" ] || [ ! -f "$RUNTIME" ]; then
  echo "Cannot find a single msedgewebview2.exe in the runtime package" >&2
  exit 1
fi
mv "$(dirname "$RUNTIME")" "$STAGING/KafkaTool-Windows-x64/WebView2"
cd "$PROJECT_DIR/desktop"
wails build -platform windows/amd64 -skipbindings
cp build/bin/KafkaTool.exe "$STAGING/KafkaTool-Windows-x64/KafkaTool.exe"
cp "$PROJECT_DIR/scripts/windows/README.txt" "$STAGING/KafkaTool-Windows-x64/README.txt"
printf '%s\n' "$VERSION" > "$STAGING/KafkaTool-Windows-x64/WebView2-version.txt"
# Validate application and bundled runtime before compiling the installer.
python3 - "$STAGING/KafkaTool-Windows-x64" <<'CHECK'
from pathlib import Path
import struct
import sys
source = Path(sys.argv[1])
for executable in (source / "KafkaTool.exe", source / "WebView2/msedgewebview2.exe"):
    with executable.open("rb") as stream:
        if stream.read(2) != b"MZ":
            raise SystemExit(f"Invalid executable: {executable}")
        stream.seek(0x3C)
        offset = struct.unpack("<I", stream.read(4))[0]
        stream.seek(offset)
        if stream.read(6) != b"PE\0\0\x64\x86":
            raise SystemExit(f"Expected Windows x64 executable: {executable}")
CHECK

makensis -WX -V2 "-DSOURCE_DIR=$STAGING/KafkaTool-Windows-x64" "-DOUTPUT_FILE=$PROJECT_DIR/release/KafkaTool-Windows-x64-Setup.exe" "$PROJECT_DIR/scripts/windows/installer.nsi"
python3 - "$PROJECT_DIR/release/KafkaTool-Windows-x64-Setup.exe" <<'CHECK'
import hashlib
from pathlib import Path
import sys
p = Path(sys.argv[1])
with p.open("rb") as stream:
    digest = hashlib.file_digest(stream, "sha256").hexdigest()
p.with_suffix(".exe.sha256").write_text(f"{digest}  {p.name}\n")
CHECK
echo "Installer complete: $PROJECT_DIR/release/KafkaTool-Windows-x64-Setup.exe"
