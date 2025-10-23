# USDC Mint Setup

This folder contains scripts to initialize a USDC mint account on localnet with a fixed keypair.

## Overview

The USDC mint needs to be created once on your local Solana validator. The mint address is hardcoded in the frontend as `C1RWC7Ts6iDfdUGRvEfm8AgQgHHi2BiURcQq9uXULD1w` to ensure consistency across validator restarts (when using a persistent ledger).

The corresponding keypair is stored in `/anchor/usdc-mint-keypair.json`.

## Prerequisites

1. **Solana CLI** - [Installation guide](https://docs.solana.com/cli/install-solana-cli-tools)
2. **spl-token CLI** - Install with: `cargo install spl-token-cli`
3. **Running Solana validator** - Start with:
   ```bash
   pnpm anchor-localnet
   ```
   Or use a persistent ledger:
   ```bash
   solana-test-validator --ledger ./ledger
   ```

## Setup Steps

### Option 1: Using Bash Script (Recommended)

```bash
cd anchor/scripts/usdc-setup
chmod +x init-usdc-mint.sh
./init-usdc-mint.sh
```

### Option 2: Using Node.js Script

```bash
cd anchor/scripts/usdc-setup
node init-usdc-mint.js
```

Or with a custom RPC URL:

```bash
SOLANA_RPC_URL=http://localhost:8899 node init-usdc-mint.js
```

### Option 3: Manual CLI Commands

```bash
# 1. Set your local cluster
solana config set --url localhost

# 2. Create the USDC mint
spl-token create-token anchor/usdc-mint-keypair.json --decimals 6

# 3. Verify it was created
spl-token display C1RWC7Ts6iDfdUGRvEfm8AgQgHHi2BiURcQq9uXULD1w
```

## Using the USDC Mint

Once the mint is created, you can:

1. **Create ATAs (Associated Token Accounts)**:
   ```bash
   spl-token create-account C1RWC7Ts6iDfdUGRvEfm8AgQgHHi2BiURcQq9uXULD1w
   ```

2. **Mint tokens**:
   ```bash
   spl-token mint C1RWC7Ts6iDfdUGRvEfm8AgQgHHi2BiURcQq9uXULD1w 1000
   ```

3. **Transfer tokens**:
   ```bash
   spl-token transfer C1RWC7Ts6iDfdUGRvEfm8AgQgHHi2BiURcQq9uXULD1w 100 <recipient-address>
   ```

## Troubleshooting

### "Mint already exists"
This is not an error - the mint has already been created. You can proceed with using it.

### "Account does not exist"
Make sure your Solana validator is running:
```bash
solana cluster-version --url localhost
```

### "Permission denied" running the bash script
Make the script executable:
```bash
chmod +x anchor/scripts/usdc-setup/init-usdc-mint.sh
```

### "Keypair not found"
Make sure you're running the script from the correct directory or that the keypair exists at `anchor/usdc-mint-keypair.json`.

## Files

- **`init-usdc-mint.sh`** - Bash script for creating the USDC mint
- **`init-usdc-mint.js`** - Node.js script for creating the USDC mint
- **`README.md`** - This file

## Mint Details

- **Address**: `C1RWC7Ts6iDfdUGRvEfm8AgQgHHi2BiURcQq9uXULD1w`
- **Keypair**: `../usdc-mint-keypair.json`
- **Decimals**: 6 (standard USDC)
- **Mint Authority**: Your wallet (payer account)
- **Freeze Authority**: Your wallet (payer account)

## Persistence

The mint account will persist across validator restarts **only if** you use a persistent ledger:

```bash
solana-test-validator --ledger ./ledger
```

If you use `pnpm anchor-localnet` without the `--ledger` flag, the ledger is not persistent and the mint will be lost when you restart the validator.

## Integration with Frontend

The frontend has a sidebar section "USDC Localnet Management" (admin-only) that displays the mint address. This is for reference only - the actual mint creation happens via this script.

The mint address is defined in:
- Frontend: `src/features/canadianreitinvest/hooks/use-initialize-usdc-mint.ts`
  - Constant: `LOCALNET_USDC_MINT_ADDRESS`
