// paste into node/ts to verify: replace SIG, PROGRAM_ID, ADMIN_PUBKEY, REIT_ID
import { Connection, PublicKey } from '@solana/web3.js'
import { parse as uuidParse } from 'uuid'

const conn = new Connection('http://localhost:8899', 'confirmed')
const tx = await conn.getTransaction('4ddqCA8g7y4Jpic7cqwuTYujpa1iKvg2WJVeT6LRA9mu9aU76rHvVERqEYCQToVHwCh8DdW8WNstCSetAaCoTMHF', { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
if (!tx) {
  console.error('Transaction not found.')
  process.exit(2)
}
// tx.transaction.message.accountKeys.forEach((k,i)=>console.log(i, k.toBase58()))
// derive PDAs with seeds from IDL
const programId = new PublicKey('HKE3kVkw621wdSJmsaZxHxLK1TaHQevvGAUh9Z3YxH7B')
const uuid = 'e6683906-ea07-452f-8700-d0ef62055821'
const reitIdHash = uuidParse(uuid)
const [fundraiser] = await PublicKey.findProgramAddress([Buffer.from('fundraiser'), Buffer.from(reitIdHash)], programId)
console.log('fundraiser', fundraiser.toBase58())