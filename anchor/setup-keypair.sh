#!/bin/bash

# Script to ensure the backed-up keypair is used for deployment
# This prevents program ID changes during builds

KEYPAIR_BACKUP="keys/canadianreitinvest-keypair.json"
KEYPAIR_TARGET="target/deploy/canadianreitinvest-keypair.json"

if [ -f "$KEYPAIR_BACKUP" ]; then
    echo "Copying backed-up keypair to deployment location..."
    cp "$KEYPAIR_BACKUP" "$KEYPAIR_TARGET"
    echo "Keypair ready for deployment. Program ID: $(solana-keygen pubkey $KEYPAIR_TARGET)"
else
    echo "Error: Backed-up keypair not found at $KEYPAIR_BACKUP"
    echo "Run this script from the anchor/ directory"
    exit 1
fi