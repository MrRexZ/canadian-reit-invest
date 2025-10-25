#!/bin/bash

# Script to mint USDC tokens to a specified wallet on localnet
# Assumes the USDC mint exists at the address derived from src/config/usdc-mint-keypair.json
# Run this after creating the mint: bash scripts/mint-usdc-tokens.sh <recipient_address> <amount>

set -e

# Check arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <recipient_address> <amount>"
    echo "Example: $0 7xvth2P8U5Zf1w7P8Q32wcub5BVqP8eXb7wwpaH4iA7X 1000"
    echo "Mints USDC to the specified wallet on localhost"
    exit 1
fi

RECIPIENT_ADDRESS=$1
AMOUNT=$2

# Set recipient pubkey
RECIPIENT_PUBKEY=$RECIPIENT_ADDRESS
echo "Recipient: $RECIPIENT_PUBKEY"

echo "🚀 Starting USDC Mint to wallet $RECIPIENT_PUBKEY for $AMOUNT tokens..."

# Check if solana CLI is available
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it from https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

if ! command -v spl-token &> /dev/null; then
    echo "❌ SPL Token CLI not found. Please install it: cargo install spl-token-cli"
    exit 1
fi

# Set localnet endpoint
ENDPOINT="http://localhost:8899"

# Check if validator is running
echo "⏳ Checking localnet connection..."
if ! solana cluster-version --url "$ENDPOINT" &> /dev/null; then
    echo "❌ Could not connect to localnet validator at $ENDPOINT"
    echo "   Please start the validator with: pnpm anchor-localnet"
    exit 1
fi

echo "✅ Connected to localnet validator"

# Read keypair from src/config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MINT_KEYPAIR="$PROJECT_ROOT/src/config/usdc-mint-keypair.json"

if [ ! -f "$MINT_KEYPAIR" ]; then
    echo "❌ Mint keypair not found at: $MINT_KEYPAIR"
    exit 1
fi

# Derive mint address from keypair
MINT_ADDRESS=$(solana-keygen pubkey "$MINT_KEYPAIR")
echo "🪙 Mint address: $MINT_ADDRESS"

# Check if mint exists
echo "⏳ Checking if mint exists..."
if ! solana account "$MINT_ADDRESS" --url "$ENDPOINT" &> /dev/null; then
    echo "❌ USDC Mint does not exist at: $MINT_ADDRESS"
    echo "   Please create it first with: bash scripts/create-usdc-mint.sh"
    exit 1
fi

echo "✅ USDC Mint exists"

# Get faucet keypair for fee-payer
FAUCET_KEYPAIR="$PROJECT_ROOT/anchor/ledger/faucet-keypair.json"
if [ ! -f "$FAUCET_KEYPAIR" ]; then
    echo "❌ Faucet keypair not found at: $FAUCET_KEYPAIR"
    exit 1
fi

FAUCET_PUBKEY=$(solana-keygen pubkey "$FAUCET_KEYPAIR")

# Get or create the associated token account
echo "⏳ Ensuring ATA exists for recipient..."
OUTPUT=$(spl-token create-account "$MINT_ADDRESS" --owner "$RECIPIENT_PUBKEY" --url "$ENDPOINT" --fee-payer "$FAUCET_KEYPAIR" 2>&1 || true)
if [[ "$OUTPUT" =~ Creating\ account\ ([A-Za-z0-9]+) ]]; then
    ATA="${BASH_REMATCH[1]}"
elif [ -z "$OUTPUT" ] || [[ "$OUTPUT" == *error* ]]; then
    # Try to get existing ATA
    ATA=$(spl-token accounts --owner "$RECIPIENT_PUBKEY" --url "$ENDPOINT" | grep "$MINT_ADDRESS" | awk '{print $1}')
fi

if [ -z "$ATA" ]; then
    echo "❌ Failed to create or find ATA"
    exit 1
fi

echo "ATA: $ATA"

# Mint tokens
echo "⏳ Minting $AMOUNT USDC to faucet wallet..."
spl-token mint "$MINT_ADDRESS" "$AMOUNT" "$ATA" --url "$ENDPOINT" --owner "$MINT_KEYPAIR"

echo ""
echo "🎉 Minting complete!"
echo "   Minted $AMOUNT USDC to wallet $RECIPIENT_PUBKEY"
echo "   ATA: $ATA"
echo ""