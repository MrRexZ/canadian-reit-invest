#!/bin/bash

# USDC Mint Setup Script for Localnet
# This script initializes a USDC mint account with a fixed keypair
# Usage: ./init-usdc-mint.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ANCHOR_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
KEYPAIR_PATH="$ANCHOR_DIR/usdc-mint-keypair.json"

echo -e "${YELLOW}=== USDC Mint Setup ===${NC}"
echo ""

# Check if solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: solana CLI not found. Please install it first.${NC}"
    echo "Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if spl-token CLI is installed
if ! command -v spl-token &> /dev/null; then
    echo -e "${RED}Error: spl-token CLI not found. Please install it first.${NC}"
    echo "Run: cargo install spl-token-cli"
    exit 1
fi

# Check if keypair exists
if [ ! -f "$KEYPAIR_PATH" ]; then
    echo -e "${RED}Error: USDC mint keypair not found at $KEYPAIR_PATH${NC}"
    echo "This keypair should have been generated during project setup."
    exit 1
fi

# Get the public key from keypair
MINT_ADDRESS=$(solana-keygen pubkey "$KEYPAIR_PATH")
echo -e "${GREEN}✓ USDC Mint Address: $MINT_ADDRESS${NC}"
echo ""

# Get current RPC URL
RPC_URL=$(solana config get | grep "RPC URL" | awk '{print $NF}')
echo "RPC URL: $RPC_URL"

# Get payer keypair (current configured keypair)
PAYER=$(solana config get | grep "Keypair Path" | awk '{print $NF}')
echo "Payer: $PAYER"
echo ""

# Check if mint already exists
echo -e "${YELLOW}Checking if USDC mint already exists...${NC}"
if solana account "$MINT_ADDRESS" --url "$RPC_URL" &> /dev/null; then
    echo -e "${GREEN}✓ USDC mint already exists!${NC}"
    spl-token display "$MINT_ADDRESS" --url "$RPC_URL"
    exit 0
fi

echo -e "${YELLOW}Mint does not exist yet. Creating...${NC}"
echo ""

# Create the mint
echo -e "${YELLOW}Creating USDC mint...${NC}"
spl-token create-token \
    "$KEYPAIR_PATH" \
    --decimals 6 \
    --url "$RPC_URL" \
    --owner "$PAYER"

echo ""
echo -e "${GREEN}✓ USDC mint created successfully!${NC}"
echo -e "${GREEN}Mint Address: $MINT_ADDRESS${NC}"
echo ""

# Display mint details
echo -e "${YELLOW}Mint Details:${NC}"
spl-token display "$MINT_ADDRESS" --url "$RPC_URL"

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "You can now use this mint address in your fundraiser initialization:"
echo -e "${YELLOW}  $MINT_ADDRESS${NC}"
