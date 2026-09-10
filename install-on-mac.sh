#!/usr/bin/env bash
# Makes a Scriptorium.app that was built somewhere else runnable on this Mac.
#
# Only needed for a bundle cross-built on Linux. `npm run dist:mac` on a Mac
# already does the signing part itself, in scripts/afterPack.cjs, at the one
# moment the signature ends up inside the artifact.
#
# Two things stop a foreign bundle from starting:
#   - the quarantine attribute Gatekeeper attaches to anything downloaded
#   - the missing signature. Apple Silicon refuses to launch an unsigned bundle
#     and kills it with an error that reads like a crash inside the app, not
#     like a security refusal. codesign only exists on macOS, so a Linux build
#     cannot have done this for us.
set -euo pipefail

APP="${1:-Scriptorium.app}"

if [ ! -d "$APP" ]; then
  echo "No such bundle: $APP" >&2
  echo "Usage: ./install-on-mac.sh [path/to/Scriptorium.app]" >&2
  exit 1
fi

echo "Clearing quarantine on $APP"
xattr -cr "$APP"

echo "Ad-hoc signing $APP"
codesign --force --deep --sign - "$APP"

echo "Verifying"
codesign --verify --deep --strict --verbose=2 "$APP"

echo
echo "Done. Open it from Finder — launching from a terminal can mask the very"
echo "failure this script exists to prevent."
