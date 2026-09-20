#!/usr/bin/env bash
set -euo pipefail

# Restore dependencies after isolated task branches are merged. Both commands
# are non-interactive and idempotent, so this script is safe to rerun.
#
# The imported backend requirements include an Emergent-hosted litellm wheel.
# It is not needed by the Gemini integration and is unavailable from the
# workspace package index, so omit it during environment restoration.
public_requirements="$(mktemp)"
trap 'rm -f "$public_requirements"' EXIT
grep -Ev '^litellm @' backend/requirements.txt > "$public_requirements"
python -m pip install --disable-pip-version-check --no-input -r "$public_requirements"
yarn --cwd frontend install --non-interactive