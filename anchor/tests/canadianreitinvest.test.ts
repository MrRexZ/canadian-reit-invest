import { TOKEN_PROGRAM_ID, createMint } from '@solana/spl-token'
import { Keypair, PublicKey } from '@solana/web3.js'
import { Program } from '@coral-xyz/anchor'
import { Canadianreitinvest } from '../target/types/canadianreitinvest'
import * as anchor from '@coral-xyz/anchor'

describe('canadianreitinvest', () => {
  let program: Program<Canadianreitinvest>
  let admin: Keypair
  let usdcMint: PublicKey

  beforeAll(async () => {
    // Set up Anchor provider
    const provider = anchor.AnchorProvider.env()
    anchor.setProvider(provider)
    program = anchor.workspace.Canadianreitinvest as Program<Canadianreitinvest>

    admin = anchor.web3.Keypair.generate()
    // Airdrop SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(admin.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    )
    // Create USDC mint
    usdcMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6
    )
  })

  it('initializes fundraiser successfully', async () => {
    const reitId = 'REIT-001'
    const [fundraiserPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('fundraiser'), admin.publicKey.toBuffer(), Buffer.from(reitId)],
      program.programId
    )
    const [escrowVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_vault'), fundraiserPda.toBuffer()],
      program.programId
    )

    await program.methods
      .initializeFundraiser(reitId)
      .accounts({
        // @ts-ignore
        fundraiser: fundraiserPda,
        admin: admin.publicKey,
        // @ts-ignore
        escrowVault,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc()

    // Fetch and assert fundraiser PDA
    const fundraiserAccount = await program.account.fundraiser.fetch(fundraiserPda)
    expect(fundraiserAccount.admin.toString()).toBe(admin.publicKey.toString())
    expect(fundraiserAccount.reitId).toBe(reitId)
    expect(fundraiserAccount.escrowVault.toString()).toBe(escrowVault.toString())
    expect(fundraiserAccount.totalRaised.toNumber()).toBe(0)
  // tokenMetadata removed from account
  expect(fundraiserAccount.releasedAmount.toNumber()).toBe(0)
    expect(fundraiserAccount.investmentCounter.toNumber()).toBe(0)

    // Check escrow vault exists
    const escrowAccount = await program.provider.connection.getAccountInfo(escrowVault)
    expect(escrowAccount).not.toBeNull()
  })
})
