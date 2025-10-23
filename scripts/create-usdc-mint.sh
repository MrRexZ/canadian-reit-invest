#!/bin/bash

# Script to create a USDC mint token on localnet with a fixed address
# Hardcoded keypair: FRuc4oH5hoY1ph7Kxnnz9DXs4xA6ZE23zCnYGCKHhoCN
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

# Read keypair from src/config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MINT_KEYPAIR="$PROJECT_ROOT/src/config/usdc-mint-keypair.json"

if [ ! -f "$MINT_KEYPAIR" ]; then
    echo "❌ Keypair not found at: $MINT_KEYPAIR"
    exit 1
fi

# Derive mint address from keypair
MINT_ADDRESS=$(solana-keygen pubkey "$MINT_KEYPAIR")
echo "🪙 Derived mint address from keypair: $MINT_ADDRESS"

# Check if mint already exists
echo "⏳ Checking if mint already exists..."
if solana account "$MINT_ADDRESS" --url "$ENDPOINT" &> /dev/null; then
    echo "✅ USDC Mint already exists at: $MINT_ADDRESS"
else
    echo "⏳ Creating USDC mint..."
    
    # Get faucet keypair for creating the mint
    FAUCET_KEYPAIR="$PROJECT_ROOT/anchor/ledger/faucet-keypair.json"
    if [ ! -f "$FAUCET_KEYPAIR" ]; then
        echo "❌ Faucet keypair not found at: $FAUCET_KEYPAIR"
        exit 1
    fi
    
    # Create the mint account with 6 decimals
    if ! spl-token create-token "$MINT_KEYPAIR" --decimals 6 --url "$ENDPOINT" --fee-payer "$FAUCET_KEYPAIR"; then
        echo "❌ Failed to create mint"
        exit 1
    fi
    
    echo "✅ USDC Mint created at: $MINT_ADDRESS"
fi

echo ""
echo "🎉 USDC Mint setup complete!"
echo "   Mint address: $MINT_ADDRESS"
echo ""
echo "Next steps:"
echo "  1. Start the frontend with: pnpm dev"
echo "  2. Use the 'Mint Tokens' tab to mint USDC to test wallets"
echo ""

