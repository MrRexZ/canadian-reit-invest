// paste into node/ts to verify: replace SIG, PROGRAM_ID, ADMIN_PUBKEY, REIT_ID
import { Connection, PublicKey } from '@solana/web3.js'
import { parse as uuidParse } from 'uuid'

const conn = new Connection('http://localhost:8899', 'confirmed')
const programId = new PublicKey('FuEhMFWU9Ui35a9mpavfy7AYGqEX8diUSk1CZonEUivH')
const uuid = '4088a2c6-97dc-421f-8b65-9acaf7a098e4' // REIT ID to test
const reitIdHash = uuidParse(uuid)
const [fundraiser] = await PublicKey.findProgramAddress([Buffer.from('fundraiser'), Buffer.from(reitIdHash)], programId)
console.log('fundraiser', fundraiser.toBase58())

// Display the fundraiser data
await displayFundraiserData(fundraiser.toBase58())

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

// Function to parse and display fundraiser PDA data
async function displayFundraiserData(fundraiserPdaAddress) {
  const fundraiserAccount = await conn.getAccountInfo(new PublicKey(fundraiserPdaAddress))
  if (!fundraiserAccount) {
    throw new Error('Fundraiser account not found')
  }

  const data = fundraiserAccount.data
  
  // Parse fundraiser account data
  // Structure: discriminator (8) + admin (32) + usdc_mint (32) + reit_mint (32) + escrow_vault (32) + total_raised (8) + released_amount (8) + bump (1) + reit_accepted_currency (3)
  const admin = new PublicKey(data.slice(8, 40)).toBase58()
  const usdcMint = new PublicKey(data.slice(40, 72)).toBase58()
  const reitMint = new PublicKey(data.slice(72, 104)).toBase58()
  const escrowVault = new PublicKey(data.slice(104, 136)).toBase58()
  const totalRaised = data.readBigUInt64LE(136)
  const releasedAmount = data.readBigUInt64LE(144)
  const bump = data.readUInt8(152)
  const reitAcceptedCurrency = data.slice(153, 156).toString('utf8')

  console.log('\n=== Fundraiser PDA Data ===')
  console.log(`Address: ${fundraiserPdaAddress}`)
  console.log(`Admin: ${admin}`)
  console.log(`USDC Mint: ${usdcMint}`)
  console.log(`REIT Mint: ${reitMint}`)
  console.log(`Escrow Vault: ${escrowVault}`)
  console.log(`Total Raised: ${totalRaised} (micro USDC)`)
  console.log(`Released Amount: ${releasedAmount} (micro USDC)`)
  console.log(`Bump: ${bump}`)
  console.log(`REIT Accepted Currency: ${reitAcceptedCurrency}`)
  console.log('===========================\n')
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
const investorPubkey = 'BjSGrxP1QdnYEYhifv5NRg2zPVZS9hK1uCMnLn94h7QC' // The actual investor signer pubkey
const fundraiserPubkey = fundraiser.toBase58() // Use the fundraiser PDA from above
const recentInvestmentPDA = await findRecentInvestmentPDA(investorPubkey, fundraiserPubkey)
console.log('Recent investment PDA:', recentInvestmentPDA)

// Also display the investment data
await displayInvestmentData(recentInvestmentPDA)