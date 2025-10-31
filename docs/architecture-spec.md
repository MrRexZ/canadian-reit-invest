# North American REIT Investment Platform - Technical Specification

## Overview
Decentralized REIT platform on Solana. Users invest USDC, which is converted to fiat off-chain and wired to North American REITs. Investors receive tokenized REIT shares and earn dividends.

## Investment Lifecycle

1. **Initialize**: Admin creates Fundraiser PDA and REIT token mint
2. **Invest**: User deposits USDC → creates Investment PDA (status: `Pending`)
3. **Release**: Admin releases USDC from escrow → `Released`
4. **Wire**: Admin confirms fiat conversion and REIT wiring → `Wired`
5. **Issue Share**: Admin mints REIT tokens to user → `ShareIssued`
6. **Refund**: If wiring fails, USDC returned → `Refunded`
7. **Dividend**: Admin distributes USDC proportional to REIT holdings

## Program Instructions

| Instruction | Actor | Description |
|-------------|-------|-------------|
| `initialize_fundraiser` | Admin | Create fundraiser and escrow vault |
| `create_reit_mint` | Admin | Create REIT token mint with metadata |
| `update_reit_mint` | Admin | Update REIT token metadata |
| `initialize_investor` | User | Create investor profile PDA |
| `invest` | User | Deposit USDC to escrow |
| `release` | Admin | Transfer USDC from escrow to admin |
| `wire` | Admin | Confirm fiat wiring completion |
| `issue_share` | Admin | Mint REIT tokens to investor |
| `refund` | Admin | Return USDC to investor |
| `issue_dividend` | Admin | Distribute dividends to REIT holders |
| `close_investor` | User | Close investor profile |

## Account Architecture

### Fundraiser PDA
Seeds: `[b"fundraiser", reit_id_hash]`

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

### Investor PDA
Seeds: `[b"investor", investor_pubkey]`

```rust
pub struct Investor {
    pub investor_pubkey: Pubkey,
    pub bump: u8,
}
```

### InvestorFundraiser PDA
Seeds: `[b"investor_fundraiser", investor_pubkey, fundraiser_pubkey]`

```rust
pub struct InvestorFundraiser {
    pub investor: Pubkey,
    pub fundraiser: Pubkey,
    pub investment_counter: u64,
    pub bump: u8,
}
```

### Investment PDA
Seeds: `[b"investment", investor_pubkey, fundraiser_pubkey, investment_counter]`

```rust
pub struct Investment {
    pub investor: Pubkey,
    pub fundraiser: Pubkey,
    pub usdc_amount: u64,
    pub reit_amount: u32,
    pub status: InvestmentStatus,
    pub bump: u8,
}

pub enum InvestmentStatus {
    Pending = 0,
    Released = 1,
    Refunded = 2,
    Wired = 3,
    ShareIssued = 4,
    ShareSold = 5,
}
```

### Token Accounts
- **Escrow Vault**: SPL Token Account (USDC, authority: Fundraiser PDA)
- **REIT Mint**: SPL Token Mint with Metaplex metadata (authority: Fundraiser PDA)
- **User USDC ATA**: Investor's USDC account (investment source, dividend recipient)
- **User REIT ATA**: Investor's REIT token account
- **Admin USDC ATA**: Admin's USDC account (receives released funds for fiat conversion)