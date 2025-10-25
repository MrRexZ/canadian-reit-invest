// paste into node/ts to verify: replace SIG, PROGRAM_ID, ADMIN_PUBKEY, REIT_ID
import { Connection, PublicKey } from '@solana/web3.js'
const conn = new Connection('http://localhost:8899', 'confirmed')
const tx = await conn.getTransaction('28miXkNuqhS8QWfEcyV6FSGNZ3ck3vmP1VLWXPF68tFRUU97nj4fZCzPJiQBeMdBmGTtpyz6HQojGbL7PA1Eq7tG', { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
if (!tx) {
  console.error('Transaction not found.')
  process.exit(2)
}
// tx.transaction.message.accountKeys.forEach((k,i)=>console.log(i, k.toBase58()))
// derive PDAs with seeds from IDL
const programId = new PublicKey('FuEhMFWU9Ui35a9mpavfy7AYGqEX8diUSk1CZonEUivH')
const admin = new PublicKey('7xvth2P8U5Zf1w7P8Q32wcub5BVqP8eXb7wwpaH4iA7X')
const reitId = 'REIT-001'
const [fundraiser] = await PublicKey.findProgramAddress([Buffer.from('fundraiser'), admin.toBuffer(), Buffer.from(reitId)], programId)
const [tokenMetadata] = await PublicKey.findProgramAddress([Buffer.from('token_metadata'), Buffer.from(reitId)], programId)
console.log('fundraiser', fundraiser.toBase58(), 'token_metadata', tokenMetadata.toBase58())