import { PublicKey } from '@solana/web3.js'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '../generated/programs/canadianreitinvest'

/**
 * Derives the InvestorFundraiser PDA for tracking investment counters per fundraiser
 * @param investor - The investor's public key
 * @param fundraiser - The fundraiser's public key
 * @returns The derived PDA and bump
 */
export function deriveInvestorFundraiserPda(
  investor: PublicKey,
  fundraiser: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('investor_fundraiser'),
      investor.toBuffer(),
      fundraiser.toBuffer(),
    ],
    new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS)
  )
}

/**
 * Derives the Investment PDA using the new per-fundraiser counter
 * @param investor - The investor's public key
 * @param fundraiser - The fundraiser's public key
 * @param investmentCounter - The investment counter for this fundraiser
 * @returns The derived PDA and bump
 */
export function deriveInvestmentPda(
  investor: PublicKey,
  fundraiser: PublicKey,
  investmentCounter: number
): [PublicKey, number] {
  // Encode counter as u64 little-endian bytes to match Rust's to_le_bytes()
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64LE(BigInt(investmentCounter))

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('investment'),
      investor.toBuffer(),
      fundraiser.toBuffer(),
      counterBuffer,
    ],
    new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS)
  )
}

/**
 * Derives the Investor PDA
 * @param investor - The investor's public key
 * @returns The derived PDA and bump
 */
export function deriveInvestorPda(investor: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('investor'), investor.toBuffer()],
    new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS)
  )
}

/**
 * Derives the Fundraiser PDA
 * @param fundraiser - The fundraiser's public key
 * @returns The derived PDA and bump
 */
export function deriveFundraiserPda(fundraiser: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('fundraiser'), fundraiser.toBuffer()],
    new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS)
  )
}