### Investment Flow

1. **Invest**: User sends USDC to escrow vault. Creates Investment PDA with status `Pending`.
2. **Release**: Admin releases USDC from escrow to admin's USDC ATA. Updates Investment status to `Released`.
3. **Wire**: Admin confirms off-chain CAD conversion and wiring to REIT. Updates Investment status to `Wired`.
4. **Issue Share**: Admin mints REIT tokens to user's REIT ATA based on share price. Updates Investment status to `ShareIssued`.
5. **Refund**: If wiring fails, USDC returned to user. Updates Investment status to `Refunded`.
6. **Issue Dividend**: Admin distributes USDC dividends to investors proportional to REIT holdings.

### Account Architecture

**Fundraiser PDA**
- Seeds: `[b"fundraiser", reit_id_hash]`
- Manages fundraiser configuration and tracks aggregates

```rust
pub struct Fundraiser {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub reit_mint: Pubkey,
    pub escrow_vault: Pubkey,
    pub total_raised: u64,
    pub released_amount: u64,
    pub reit_accepted_currency: [u8; 3],
    pub bump: u8,
}
```

**Investor PDA**
- Seeds: `[b"investor", investor_pubkey]`
- Tracks investor profile

```rust
pub struct Investor {
    pub investor_pubkey: Pubkey,
    pub bump: u8,
}
```

**InvestorFundraiser PDA**
- Seeds: `[b"investor_fundraiser", investor_pubkey, fundraiser_pubkey]`
- Tracks investment counter per investor-fundraiser pair

```rust
pub struct InvestorFundraiser {
    pub investor: Pubkey,
    pub fundraiser: Pubkey,
    pub investment_counter: u64,
    pub bump: u8,
}
```

**Investment PDA**
- Seeds: `[b"investment", investor_pubkey, fundraiser_pubkey, investment_counter]`
- Tracks individual investment with lifecycle status

```rust
pub struct Investment {
    pub investor: Pubkey,
    pub fundraiser: Pubkey,
    pub usdc_amount: u64,
    pub reit_amount: u32,
    pub status: InvestmentStatus, // Pending | Released | Refunded | Wired | ShareIssued | ShareSold
    pub bump: u8,
}
```

**Supporting Accounts**
- **Escrow Vault**: SPL Token Account (USDC, authority: Fundraiser PDA)
- **REIT Token Mint**: SPL Mint with Metaplex metadata (authority: Fundraiser PDA)
- **User USDC ATA**: Source of investment funds and dividend recipient
- **User REIT ATA**: Holds minted REIT tokens
- **Admin USDC ATA**: Receives released funds for CAD conversion