#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "$SCRIPT_DIR"

set -a  # Automatically export variables
source "$SCRIPT_DIR/.env"
set +a  # Disable automatic export

$(which node) $SCRIPT_DIR/dist/index.js
