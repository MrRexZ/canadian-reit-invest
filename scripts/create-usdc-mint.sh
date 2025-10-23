#!/bin/bash

# Script to create a USDC mint token on localnet with a fixed address
# Run this before starting the frontend: bash scripts/create-usdc-mint.sh

set -e

echo "🚀 Starting USDC Mint creation on localnet..."

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

# Path to the fixed mint keypair
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LEDGER_DIR="$PROJECT_ROOT/anchor/ledger"
MINT_KEYPAIR="$LEDGER_DIR/usdc-mint-keypair.json"

if [ ! -f "$MINT_KEYPAIR" ]; then
    echo "❌ Mint keypair not found at: $MINT_KEYPAIR"
    exit 1
fi

# Get the mint address
MINT_ADDRESS=$(solana-keygen pubkey "$MINT_KEYPAIR")
echo "🪙 Using fixed mint address: $MINT_ADDRESS"

# Get faucet keypair
FAUCET_KEYPAIR="$LEDGER_DIR/faucet-keypair.json"
if [ ! -f "$FAUCET_KEYPAIR" ]; then
    echo "❌ Faucet keypair not found at: $FAUCET_KEYPAIR"
    exit 1
fi

FAUCET_ADDRESS=$(solana-keygen pubkey "$FAUCET_KEYPAIR")
echo "📝 Faucet account: $FAUCET_ADDRESS"

# Check faucet balance
BALANCE=$(solana balance "$FAUCET_ADDRESS" --url "$ENDPOINT")
echo "💰 Faucet balance: $BALANCE"

# Set the keypair for solana CLI
solana config set --keypair "$FAUCET_KEYPAIR" --url "$ENDPOINT" &> /dev/null

# Check if mint already exists
echo "⏳ Checking if mint already exists..."
if solana account "$MINT_ADDRESS" --url "$ENDPOINT" &> /dev/null; then
    echo "✅ USDC Mint already exists at: $MINT_ADDRESS"
else
    echo "⏳ Creating USDC mint..."
    
    # Create the mint account with 6 decimals
    if ! spl-token create-token "$MINT_KEYPAIR" --decimals 6 --url "$ENDPOINT"; then
        echo "❌ Failed to create mint"
        exit 1
    fi
    
    echo "✅ USDC Mint created at: $MINT_ADDRESS"
fi

echo ""
echo "🎉 USDC Mint setup complete!"
echo "   Mint address: $MINT_ADDRESS"
echo ""
echo "The mint address is already configured in src/lib/cluster-config.ts"
echo ""
echo "Next steps:"
echo "  1. Start the frontend with: pnpm dev"
echo "  2. Use the 'Mint Tokens' tab to mint USDC to test wallets"
echo ""

