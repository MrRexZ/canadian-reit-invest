# USDC Mint Setup for Localnet

This guide explains how to set up and use the fixed USDC mint token on localnet.

## Quick Start

### 1. Start the Localnet Validator

```bash
pnpm anchor-localnet
```

### 2. Create the USDC Mint (in a new terminal)

```bash
bash scripts/create-usdc-mint.sh
```

This script will:
- Use the fixed keypair stored at `anchor/ledger/usdc-mint-keypair.json`
- Create a USDC mint token with 6 decimals on localnet
- Verify that the mint was created successfully
- Display the fixed mint address: `FRuc4oH5hoY1ph7Kxnnz9DXs4xA6ZE23zCnYGCKHhoCN`

### 3. Start the Frontend

```bash
pnpm dev
```

## Using the Mint Tokens Feature

Once the frontend is running:

1. Navigate to the **Admin Dashboard**
2. Click on the **"Mint Tokens"** tab in the sidebar
3. Enter:
   - **Recipient Address**: The Solana wallet address to mint tokens to
   - **Amount (USDC)**: The amount of USDC to mint (e.g., 1000)
4. Click **"Mint Tokens"**

The tokens will be minted to the recipient's Associated Token Account (ATA) for the USDC mint.

## Fixed Mint Details

- **Address**: `FRuc4oH5hoY1ph7Kxnnz9DXs4xA6ZE23zCnYGCKHhoCN`
- **Decimals**: 6
- **Storage**: `anchor/ledger/usdc-mint-keypair.json`
- **Configuration**: Automatically set in `src/lib/cluster-config.ts`

The fixed keypair ensures the mint address remains the same across localnet validator restarts and script runs.

## Troubleshooting

### "Could not connect to localnet validator"
Make sure you've started the validator with `pnpm anchor-localnet` before running the script.

### "USDC Mint not configured"
Run `bash scripts/create-usdc-mint.sh` to create the mint.

### "Minting error: Account does not exist"
The recipient wallet's Associated Token Account (ATA) doesn't exist. The mint instruction will create it automatically. If you get this error, check that:
1. The recipient address is a valid Solana address
2. The wallet has some SOL to create the ATA (if needed)
