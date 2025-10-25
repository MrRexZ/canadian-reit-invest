import { createMint, getAssociatedTokenAddressSync, mintTo, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { sendAndConfirmTransaction } from '@solana/web3.js'
import { Keypair, PublicKey } from '@solana/web3.js'
import { Program } from '@coral-xyz/anchor'
import { Canadianreitinvest } from '../target/types/canadianreitinvest'
import * as anchor from '@coral-xyz/anchor'
import { v4 as uuidv4, parse as uuidParse } from 'uuid'

describe('canadianreitinvest', () => {
  let program: Program<Canadianreitinvest>
  let admin: Keypair
  let usdcMint: PublicKey
  let investor: Keypair
  let fundraiserPda: PublicKey
  let reitIdHash: number[]

  beforeAll(async () => {
    // Set up Anchor provider
    const provider = anchor.AnchorProvider.env()
    anchor.setProvider(provider)
    program = anchor.workspace.Canadianreitinvest as Program<Canadianreitinvest>

    admin = anchor.web3.Keypair.generate()
    investor = anchor.web3.Keypair.generate()
    // Airdrop SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(admin.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    )
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(investor.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    )
    // Create USDC mint
    usdcMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6
    )

    // Initialize fundraiser
    const uuid = uuidv4()
    reitIdHash = Array.from(uuidParse(uuid))
    ;[fundraiserPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('fundraiser'), Buffer.from(reitIdHash)],
      program.programId
    )

    await program.methods
      .initializeFundraiser(uuid, reitIdHash)
      .accounts({
        admin: admin.publicKey,
        usdcMint,
      })
      .signers([admin])
      .rpc()
  })

  it('initializes fundraiser successfully', async () => {
    // Fetch and assert fundraiser PDA
    const fundraiserAccount = await program.account.fundraiser.fetch(fundraiserPda)
    expect(fundraiserAccount.admin.toString()).toBe(admin.publicKey.toString())
    expect(fundraiserAccount.totalRaised.eq(new anchor.BN(0))).toBe(true)
    expect(fundraiserAccount.releasedAmount.eq(new anchor.BN(0))).toBe(true)
  })

  it('invests successfully, creating investor PDA and setting status to Pending', async () => {
    // Create investor's USDC ATA
    const investorUsdcAta = getAssociatedTokenAddressSync(usdcMint, investor.publicKey)
    const createAtaIx = createAssociatedTokenAccountInstruction(
      admin.publicKey, // payer
      investorUsdcAta,
      investor.publicKey, // owner
      usdcMint
    )
    const tx = new anchor.web3.Transaction().add(createAtaIx)
    await sendAndConfirmTransaction(program.provider.connection, tx, [admin])

    // Mint some USDC to the ATA
    await mintTo(
      program.provider.connection,
      admin,
      usdcMint,
      investorUsdcAta,
      admin,
      1000000 // 1 USDC
    )

    // Derive PDAs
    const [investorPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('investor'), investor.publicKey.toBuffer()],
      program.programId
    )
    const [escrowVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_vault'), fundraiserPda.toBuffer()],
      program.programId
    )
    const [investmentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('investment'),
        investor.publicKey.toBuffer(),
        fundraiserPda.toBuffer(),
        Buffer.alloc(8), // counter 0
      ],
      program.programId
    )

    // Invest
    await program.methods
      .invest(new anchor.BN(1000000), reitIdHash) // 1 USDC
      .accounts({
        investorSigner: investor.publicKey,
        investor: investorPda,
        fundraiser: fundraiserPda,
        investment: investmentPda,
        usdcMint,
        investorUsdcAta,
        escrowVault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([investor])
      .rpc()

    // Assert investor PDA was created
    const investorAccount = await program.account.investor.fetch(investorPda)
    expect(investorAccount.investorPubkey.toString()).toBe(investor.publicKey.toString())
    expect(investorAccount.investmentCounter.toNumber()).toBe(1)

    // Assert investment PDA was created with status Pending
    const investmentAccount = await program.account.investment.fetch(investmentPda)
    expect(investmentAccount.investor.toString()).toBe(investor.publicKey.toString())
    expect(investmentAccount.fundraiser.toString()).toBe(fundraiserPda.toString())
    expect(investmentAccount.usdcAmount.eq(new anchor.BN(1000000))).toBe(true)
    expect(investmentAccount.status).toBe(0) // Pending

    // Assert fundraiser total raised updated
    const fundraiserAccount = await program.account.fundraiser.fetch(fundraiserPda)
    expect(fundraiserAccount.totalRaised).toBe(1000000)
  })

  it('releases investment successfully, transferring USDC to admin and updating status', async () => {
    // First, invest to create an investment
    const investorUsdcAta = getAssociatedTokenAddressSync(usdcMint, investor.publicKey)
    const createAtaIx = createAssociatedTokenAccountInstruction(
      admin.publicKey, // payer
      investorUsdcAta,
      investor.publicKey, // owner
      usdcMint
    )
    const tx = new anchor.web3.Transaction().add(createAtaIx)
    await sendAndConfirmTransaction(program.provider.connection, tx, [admin])

    // Mint some USDC to the ATA
    await mintTo(
      program.provider.connection,
      admin,
      usdcMint,
      investorUsdcAta,
      admin,
      1000000 // 1 USDC
    )

    // Derive PDAs
    const [investorPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('investor'), investor.publicKey.toBuffer()],
      program.programId
    )
    const [escrowVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_vault'), fundraiserPda.toBuffer()],
      program.programId
    )
    const [investmentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('investment'),
        investor.publicKey.toBuffer(),
        fundraiserPda.toBuffer(),
        Buffer.alloc(8), // counter 0
      ],
      program.programId
    )

    // Invest
    await program.methods
      .invest(new anchor.BN(1000000), reitIdHash) // 1 USDC
      .accounts({
        investorSigner: investor.publicKey,
        investor: investorPda,
        fundraiser: fundraiserPda,
        investment: investmentPda,
        usdcMint,
        investorUsdcAta,
        escrowVault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([investor])
      .rpc()

    // Create admin's USDC ATA
    const adminUsdcAta = getAssociatedTokenAddressSync(usdcMint, admin.publicKey)
    const createAdminAtaIx = createAssociatedTokenAccountInstruction(
      admin.publicKey, // payer
      adminUsdcAta,
      admin.publicKey, // owner
      usdcMint
    )
    const adminTx = new anchor.web3.Transaction().add(createAdminAtaIx)
    await sendAndConfirmTransaction(program.provider.connection, adminTx, [admin])

    // Check initial balances
    const initialEscrowBalance = await program.provider.connection.getTokenAccountBalance(escrowVault)
    const initialAdminBalance = await program.provider.connection.getTokenAccountBalance(adminUsdcAta)

    // Release the investment
    await program.methods
      .release(reitIdHash)
      .accounts({
        admin: admin.publicKey,
        fundraiser: fundraiserPda,
        investment: investmentPda,
        adminUsdcAta,
        usdcMint,
        escrowVault,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc()

    // Assert investment status changed to Released
    const investmentAccount = await program.account.investment.fetch(investmentPda)
    expect(investmentAccount.status).toBe(1) // Released

    // Assert fundraiser released amount updated
    const fundraiserAccount = await program.account.fundraiser.fetch(fundraiserPda)
    expect(fundraiserAccount.releasedAmount.eq(new anchor.BN(1000000))).toBe(true)

    // Assert tokens were transferred from escrow to admin
    const finalEscrowBalance = await program.provider.connection.getTokenAccountBalance(escrowVault)
    const finalAdminBalance = await program.provider.connection.getTokenAccountBalance(adminUsdcAta)

    expect(parseInt(finalEscrowBalance.value.amount)).toBe(parseInt(initialEscrowBalance.value.amount) - 1000000)
    expect(parseInt(finalAdminBalance.value.amount)).toBe(parseInt(initialAdminBalance.value.amount) + 1000000)
  })
})
