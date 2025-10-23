# Debug Logging for USDC Mint Initialization

## Overview

Comprehensive debug logging has been added to help diagnose the "Attempt to load a program that does not exist" error when initializing a fundraiser.

## What Gets Logged

### 1. User Input (UI Component)
When you click "Initialize Fundraiser", the console logs:
- Current cluster (Devnet, Localhost, etc.)
- REIT name being created
- USDC mint address being used
- Whether it's using auto-filled or manual mint

### 2. Mint Account Verification (Before Transaction)
The most important debug step - checks if the USDC mint actually exists:
- USDC Mint Address
- Account owner (should be Token Program)
- Account lamports (balance)
- Data length (should be 82 bytes for a Mint)
- Whether account is executable
- First 32 bytes of account data (hex format)

**If this fails**, you'll see:
```
❌ USDC Mint Account NOT FOUND:
Error: USDC Mint account does not exist...
```

This is the likely cause of your error!

### 3. Transaction Details
- RPC URL and signer
- Program ID
- All PDA addresses (fundraiser, escrow vault)
- All accounts included in the transaction

### 4. Error Details
If the transaction fails, comprehensive error information is logged

## How to Check Logs

### In Browser DevTools

1. **Open DevTools**: `F12` or `Cmd+Option+J` (Mac)
2. **Go to Console** tab
3. **Try to initialize a fundraiser**
4. **Look for grouped logs**:
   - 🔍 INITIALIZE FUNDRAISER DEBUG
   - 📋 Initialize Fundraiser - User Input
   - 💰 USDC Mint Input
   - 🔎 Checking if USDC mint exists on chain...

### Key Log Sections

```javascript
// These will tell you what's wrong:

// 1. Check if mint exists
✅ USDC Mint Account Found        // Good! Proceed
❌ USDC Mint Account NOT FOUND    // This is your problem

// 2. If not found, you need to run:
// cd anchor/scripts/usdc-setup && ./init-usdc-mint.sh
```

## Troubleshooting with Logs

### Scenario 1: "USDC Mint Account NOT FOUND"

**Problem**: The USDC mint address points to an account that doesn't exist
**Solution**:
```bash
# Initialize the USDC mint
cd anchor/scripts/usdc-setup
./init-usdc-mint.sh
```

### Scenario 2: USDC Mint exists but transaction still fails

**Problem**: Account exists but something else is wrong
**Check logs for**:
- Is the account owner `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`? (Token Program)
- Is data length 82 bytes? (standard Mint size)
- Are all PDA addresses being derived correctly?

### Scenario 3: Wrong cluster detected

**Problem**: Component thinks you're on wrong cluster
**Check logs for**:
- `Cluster: Localhost` (should see this for localnet)
- If it says something else, check your Solana config

## Example Debug Output

Here's what good debug output looks like:

```javascript
🔍 INITIALIZE FUNDRAISER DEBUG
  📡 Network Connection:
    - RPC URL: [RPC client object]
    - Signer: Gs3YXqGEQRQb6ryEuH4HBdvXkYDT9KwZYmQX...

  💰 USDC Mint Input:
    - Mint Address: C1RWC7Ts6iDfdUGRvEfm8AgQgHHi2BiURcQq9uXULD1w

  🔎 Checking if USDC mint exists on chain...
  ✅ USDC Mint Account Found:
    - Owner: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
    - Lamports: 2039280
    - Data Length: 82
    - Executable: false
    - Account Data (first 32 bytes hex): [hex data]
```

## Files Modified

### 1. `src/features/canadianreitinvest/data-access/use-initialize-fundraiser-mutation.ts`
- Added cluster and connection info logging
- Added USDC mint existence check before transaction
- Added clear error message if mint doesn't exist
- Added instruction and account details logging
- Added grouped console logging for readability

### 2. `src/features/canadianreitinvest/ui/canadianreitinvest-ui-initialize-fundraiser.tsx`
- Added user input logging
- Shows what mint address is being used
- Shows cluster detection logic

## Next Steps

1. **Run dev server**: `pnpm dev`
2. **Try to initialize fundraiser**
3. **Open browser console**
4. **Look for the debug logs**
5. **Check for errors**
6. **Follow the suggested solutions**

If you see "USDC Mint Account NOT FOUND", that's your problem - initialize the mint first!
