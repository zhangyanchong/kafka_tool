#!/usr/bin/env bash
set -euo pipefail
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LOG_DIR=${XDG_STATE_HOME:-${HOME:?HOME must be set}/.local/state}/kafka-tool
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/launch-$(date +%Y%m%d-%H%M%S)-$$.log"
exec > >(tee -a "$LOG") 2>&1
echo "Startup log: $LOG"
if ! bash "$HERE/check-env.sh"; then
  echo 'Startup stopped. See README.txt and this log for details.'
  exit 1
fi
cd "$HERE"
exec "$HERE/bin/KafkaTool" "$@"
