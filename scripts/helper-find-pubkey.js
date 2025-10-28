// paste into node/ts to verify: replace SIG, PROGRAM_ID, ADMIN_PUBKEY, REIT_ID
import { Connection, PublicKey } from '@solana/web3.js'
import { parse as uuidParse } from 'uuid'

const conn = new Connection('http://localhost:8899', 'confirmed')
const programId = new PublicKey('FuEhMFWU9Ui35a9mpavfy7AYGqEX8diUSk1CZonEUivH')
// const uuid = '2c99b1c4-0ab8-4914-8418-cb8c328d04b3' // REIT ID to test
const uuid = '317c9baf-dccd-4c49-b14d-5c16d77d36f5'
const reitIdHash = uuidParse(uuid)
const [fundraiser] = await PublicKey.findProgramAddress([Buffer.from('fundraiser'), Buffer.from(reitIdHash)], programId)
console.log('fundraiser', fundraiser.toBase58())

// Display the fundraiser data
// await displayFundraiserData(fundraiser.toBase58())

// Derive and display InvestorFundraiser PDA
const investorPubkey = 'BjSGrxP1QdnYEYhifv5NRg2zPVZS9hK1uCMnLn94h7QC'
const [investorFundraiserPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('investor_fundraiser'), new PublicKey(investorPubkey).toBuffer(), fundraiser.toBuffer()],
  programId
)
console.log('investorFundraiser PDA:', investorFundraiserPda.toBase58())

// Display the InvestorFundraiser data
await displayInvestorFundraiserData(investorFundraiserPda.toBase58())

// Function to find the most recent investment PDA for an investor and fundraiser
async function findRecentInvestmentPDA(investorPubkey, fundraiserPubkey) {
  // Derive InvestorFundraiser PDA to get the per-fundraiser counter
  const [investorFundraiserPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('investor_fundraiser'), new PublicKey(investorPubkey).toBuffer(), new PublicKey(fundraiserPubkey).toBuffer()],
    programId
  )

  // Fetch InvestorFundraiser account to get investment counter for this fundraiser
  const investorFundraiserAccount = await conn.getAccountInfo(investorFundraiserPda)
  if (!investorFundraiserAccount) {
    throw new Error('InvestorFundraiser account not found - no investments for this investor-fundraiser pair')
  }

  // Parse the InvestorFundraiser account data
  // Structure: discriminator (8) + investor (32) + fundraiser (32) + investment_counter (8) + bump (1)
  const data = investorFundraiserAccount.data
  // Skip discriminator (8 bytes) + investor (32 bytes) + fundraiser (32 bytes) = 72 bytes
  // investment_counter is a u64 at offset 72
  const investmentCounter = data.readBigUInt64LE(72)

  if (investmentCounter === 0n) {
    throw new Error('No investments found for this investor-fundraiser pair')
  }

  // Most recent investment is at counter - 1
  const recentCounter = investmentCounter - 1n

  // Derive the most recent investment PDA using the per-fundraiser counter
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

// Function to parse and display InvestorFundraiser PDA data
async function displayInvestorFundraiserData(investorFundraiserPdaAddress) {
  const investorFundraiserAccount = await conn.getAccountInfo(new PublicKey(investorFundraiserPdaAddress))
  if (!investorFundraiserAccount) {
    console.log('InvestorFundraiser account not found - no investments for this investor-fundraiser pair yet')
    return
  }

  const data = investorFundraiserAccount.data

  // Parse InvestorFundraiser account data
  // Structure: discriminator (8) + investor (32) + fundraiser (32) + investment_counter (8) + bump (1)
  const investor = new PublicKey(data.slice(8, 40)).toBase58()
  const fundraiser = new PublicKey(data.slice(40, 72)).toBase58()
  const investmentCounter = data.readBigUInt64LE(72)
  const bump = data.readUInt8(80)

  console.log('\n=== InvestorFundraiser PDA Data ===')
  console.log(`Address: ${investorFundraiserPdaAddress}`)
  console.log(`Investor: ${investor}`)
  console.log(`Fundraiser: ${fundraiser}`)
  console.log(`Investment Counter: ${investmentCounter}`)
  console.log(`Bump: ${bump}`)
  console.log('===================================\n')
}

// Function to parse and display investment PDA data
async function displayInvestmentData(investmentPda) {
  const investmentAccount = await conn.getAccountInfo(investmentPda)
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

  // Map status to string
  const statusMap = {
    0: 'Pending',
    1: 'Released',
    2: 'Refunded',
    3: 'Wired',
    4: 'ShareIssued',
    5: 'ShareSold'
  }
  const statusString = statusMap[status] || 'Unknown'

  console.log('\n=== Investment PDA Data ===')
  console.log(`Address: ${investmentPda.toBase58()}`)
  console.log(`Investor: ${investor}`)
  console.log(`Fundraiser: ${fundraiser}`)
  console.log(`USDC Amount: ${usdcAmount} (micro USDC)`)
  console.log(`REIT Amount: ${reitAmount}`)
  console.log(`Status: ${statusString}`)
  console.log(`Bump: ${bump}`)
  console.log('===========================\n')
}

// Example usage:
const fundraiserPubkey = fundraiser.toBase58() // Use the fundraiser PDA from above
const recentInvestmentPDA = await findRecentInvestmentPDA(investorPubkey, fundraiserPubkey)
console.log('Recent investment PDA:', recentInvestmentPDA)

// Also display the investment data
await displayInvestmentData(recentInvestmentPDA)