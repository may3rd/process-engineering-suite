#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p .tmp

TMPDIR="$(pwd)/.tmp" bun run vitest "$@"
