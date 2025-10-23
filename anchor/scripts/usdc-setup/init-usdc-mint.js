#!/usr/bin/env node

/**
 * USDC Mint Setup Script (Node.js version)
 * 
 * This script initializes a USDC mint account with a fixed keypair on localnet.
 * 
 * Prerequisites:
 * - Solana CLI installed
 * - solana-test-validator or solana-localnet running
 * - @solana/web3.js and @solana/spl-token installed
 * 
 * Usage:
 *   node init-usdc-mint.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PublicKey, Connection, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { createInitializeMintInstruction, getMint, MINT_SIZE, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANCHOR_DIR = path.resolve(__dirname, '../..');
const KEYPAIR_PATH = path.join(ANCHOR_DIR, 'usdc-mint-keypair.json');

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

async function main() {
  log(colors.yellow, '=== USDC Mint Setup ===');
  console.log('');

  // Check if keypair exists
  if (!fs.existsSync(KEYPAIR_PATH)) {
    log(colors.red, `✗ Error: USDC mint keypair not found at ${KEYPAIR_PATH}`);
    log(colors.yellow, 'This keypair should have been generated during project setup.');
    process.exit(1);
  }

  // Load keypair
  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
  const mintKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const mintAddress = mintKeypair.publicKey;

  log(colors.green, `✓ USDC Mint Address: ${mintAddress.toBase58()}`);
  console.log('');

  // Get RPC URL from environment or use default
  const rpcUrl = process.env.SOLANA_RPC_URL || 'http://localhost:8899';
  console.log(`RPC URL: ${rpcUrl}`);

  // Connect to cluster
  const connection = new Connection(rpcUrl, 'confirmed');

  // Check if mint already exists
  log(colors.yellow, 'Checking if USDC mint already exists...');
  try {
    const mint = await getMint(connection, mintAddress);
    log(colors.green, '✓ USDC mint already exists!');
    console.log('');
    console.log('Mint Details:');
    console.log(`  Address: ${mintAddress.toBase58()}`);
    console.log(`  Decimals: ${mint.decimals}`);
    console.log(`  Supply: ${mint.supply / BigInt(10 ** mint.decimals)}`);
    console.log('');
    log(colors.green, '=== Setup Complete ===');
    return;
  } catch (error) {
    // Account doesn't exist, proceed to create it
    log(colors.yellow, 'Mint does not exist yet. Creating...');
  }

  try {
    // Get payer keypair from Solana config
    const solanaConfigPath = path.join(process.env.HOME, '.config/solana/id.json');
    if (!fs.existsSync(solanaConfigPath)) {
      log(colors.red, '✗ Error: Solana keypair not found at ~/.config/solana/id.json');
      log(colors.yellow, 'Run: solana config set --keypair <path-to-your-keypair>');
      process.exit(1);
    }

    const payerData = JSON.parse(fs.readFileSync(solanaConfigPath, 'utf-8'));
    const payer = Keypair.fromSecretKey(new Uint8Array(payerData));

    log(colors.yellow, 'Creating USDC mint...');
    console.log('');

    // Get rent exemption
    const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintAddress,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintAddress,
        6, // decimals
        payer.publicKey, // mint authority
        payer.publicKey, // freeze authority
        TOKEN_PROGRAM_ID
      )
    );

    // Sign and send transaction
    const signature = await connection.sendTransaction(transaction, [payer, mintKeypair], {
      commitment: 'confirmed',
    });

    log(colors.green, `✓ Transaction confirmed: ${signature}`);
    console.log('');

    // Verify mint was created
    const mint = await getMint(connection, mintAddress);
    log(colors.green, '✓ USDC mint created successfully!');
    log(colors.green, `Mint Address: ${mintAddress.toBase58()}`);
    console.log('');

    console.log('Mint Details:');
    console.log(`  Address: ${mintAddress.toBase58()}`);
    console.log(`  Decimals: ${mint.decimals}`);
    console.log(`  Mint Authority: ${mint.owner.toBase58()}`);
    console.log(`  Freeze Authority: ${mint.freezeAuthority?.toBase58() || 'None'}`);
    console.log('');

    log(colors.green, '=== Setup Complete ===');
    console.log('');
    console.log('You can now use this mint address in your fundraiser initialization:');
    log(colors.yellow, `  ${mintAddress.toBase58()}`);
  } catch (error) {
    log(colors.red, `✗ Error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  log(colors.red, `✗ Fatal error: ${error.message}`);
  process.exit(1);
});
