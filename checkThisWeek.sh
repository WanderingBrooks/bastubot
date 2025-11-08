#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "$SCRIPT_DIR"

set -a  # Automatically export variables
source "$SCRIPT_DIR/.env"
set +a  # Disable automatic export

# Make the logs directory if it doesn't exist
mkdir -p "/tmp/bastubot"
mkdir -p "/tmp/bastubot/this-week"

$(which node) $SCRIPT_DIR/dist/index.js 'thisWeek' >> /tmp/bastubot/this-week/log_$(date +'%Y-%m-%d_%H-%M').log 2>&1;
