// paste into node/ts to verify: replace SIG, PROGRAM_ID, ADMIN_PUBKEY, REIT_ID
import { Connection, PublicKey } from '@solana/web3.js'
import { parse as uuidParse } from 'uuid'

const conn = new Connection('http://localhost:8899', 'confirmed')
const programId = new PublicKey('FuEhMFWU9Ui35a9mpavfy7AYGqEX8diUSk1CZonEUivH')
const uuid = '3ad6b1b1-6fbc-4f6b-9df0-d6fafabedd37'
const reitIdHash = uuidParse(uuid)
const [fundraiser] = await PublicKey.findProgramAddress([Buffer.from('fundraiser'), Buffer.from(reitIdHash)], programId)
console.log('fundraiser', fundraiser.toBase58())

// Function to find the most recent investment PDA for an investor and fundraiser
async function findRecentInvestmentPDA(investorPubkey, fundraiserPubkey) {
  // Derive investor PDA
  const [investorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('investor'), new PublicKey(investorPubkey).toBuffer()],
    programId
  )

  // Fetch investor account to get investment counter
  const investorAccount = await conn.getAccountInfo(investorPda)
  if (!investorAccount) {
    throw new Error('Investor account not found')
  }

  // Parse the investor account data
  // The account data starts with 8-byte discriminator, then the fields
  const data = investorAccount.data
  // Skip discriminator (8 bytes) + investorPubkey (32 bytes) = 40 bytes
  // investmentCounter is a u64 at offset 40
  const investmentCounter = data.readBigUInt64LE(40)

  if (investmentCounter === 0n) {
    throw new Error('No investments found for this investor')
  }

  // Most recent investment is at counter - 1
  const recentCounter = investmentCounter - 1n

  // Derive the most recent investment PDA
  const counterBytes = Buffer.alloc(8)
  counterBytes.writeBigUInt64LE(recentCounter)
  const [investmentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('investment'),
      new PublicKey(investorPubkey).toBuffer(),
      new PublicKey(fundraiserPubkey).toBuffer(),
      counterBytes
    ],
    programId
  )

  return investmentPda
}

// Function to parse and display investment PDA data
async function displayInvestmentData(investmentPdaAddress) {
  const investmentAccount = await conn.getAccountInfo(new PublicKey(investmentPdaAddress))
  if (!investmentAccount) {
    throw new Error('Investment account not found')
  }

  const data = investmentAccount.data
  
  // Parse investment account data
  // Structure: discriminator (8) + investor (32) + fundraiser (32) + usdc_amount (8) + reit_amount (4) + status (1) + bump (1)
  const investor = new PublicKey(data.slice(8, 40)).toBase58()
  const fundraiser = new PublicKey(data.slice(40, 72)).toBase58()
  const usdcAmount = data.readBigUInt64LE(72)
  const reitAmount = data.readUInt32LE(80)
  const status = data.readUInt8(84)
  const bump = data.readUInt8(85)

  // Map status to readable string
  const statusNames = ['Pending', 'Released', 'Refunded', 'Wired', 'ShareIssued']
  const statusName = statusNames[status] || `Unknown(${status})`

  console.log('\n=== Investment PDA Data ===')
  console.log(`Address: ${investmentPdaAddress}`)
  console.log(`Investor: ${investor}`)
  console.log(`Fundraiser: ${fundraiser}`)
  console.log(`USDC Amount: ${usdcAmount} (micro USDC)`)
  console.log(`REIT Amount: ${reitAmount}`)
  console.log(`Status: ${statusName} (${status})`)
  console.log(`Bump: ${bump}`)
  console.log('========================\n')
}

// Example usage:
const investorPubkey = '7xvth2P8U5Zf1w7P8Q32wcub5BVqP8eXb7wwpaH4iA7X' // The actual investor signer pubkey
const fundraiserPubkey = fundraiser.toBase58() // Use the fundraiser PDA from above
const recentInvestmentPDA = await findRecentInvestmentPDA(investorPubkey, fundraiserPubkey)
console.log('Recent investment PDA:', recentInvestmentPDA)

// Also display the investment data
await displayInvestmentData(recentInvestmentPDA)