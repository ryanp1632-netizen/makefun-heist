#!/usr/bin/env bash
# Render the screenshot scenes with headless Chrome from the real game (?shot=<scene>),
# then save them as JPEGs under 256 KiB in screenshots/. Usage: bash tools/shots.sh [scene ...]
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
PORT=8093
node serve.ts --port $PORT >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1
TMP="$(mktemp -d)"
declare -A NAMES=([heist]=1-heist [plan]=2-plan [getaway]=3-getaway [results]=4-results [spotted]=x-spotted [title]=x-title)
SCENES=("$@"); [ ${#SCENES[@]} -eq 0 ] && SCENES=(heist plan getaway results)
for s in "${SCENES[@]}"; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1280,720 --virtual-time-budget=4000 \
    --screenshot="$(cygpath -w "$TMP/$s.png")" "http://localhost:$PORT/?shot=$s" >/dev/null 2>&1
  out="screenshots/${NAMES[$s]}.jpg"
  [[ "${NAMES[$s]}" == x-* ]] && out="$TMP/${NAMES[$s]}.jpg"
  python tools/to_jpeg.py "$TMP/$s.png" "$out"
done
echo "previews in $TMP"
