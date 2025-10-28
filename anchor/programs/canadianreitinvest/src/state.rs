use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Fundraiser {
    pub admin: Pubkey, // The admin public key who initializes and manages the fundraiser
    pub usdc_mint: Pubkey, // The USDC mint public key for validation of the escrow vault
    pub reit_mint: Pubkey, // The REIT token mint public key (set when REIT tokens are created)
    pub escrow_vault: Pubkey, // The escrow token account that holds USDC investments
    pub total_raised: u64, // Total USDC raised from all investments (aggregate for onchain efficiency)
    pub released_amount: u64, // Total USDC released to the admin for CAD conversion (aggregate for onchain efficiency)
    pub bump: u8, // PDA bump seed for the fundraiser account
    pub reit_accepted_currency: [u8; 3], // Currency code for the REIT (e.g., "CAD") - changed from String
}

/// Represents an investor's profile on-chain
/// Seeds: [b"investor", investor_pubkey]
#[account]
#[derive(InitSpace)]
pub struct Investor {
    pub investor_pubkey: Pubkey, // The public key of the investor
    pub bump: u8, // PDA bump seed for the investor account
}

/// Tracks investment activity for a specific investor-fundraiser pair
/// Seeds: [b"investor_fundraiser", investor_pubkey, fundraiser_pubkey]
#[account]
#[derive(InitSpace)]
pub struct InvestorFundraiser {
    pub investor: Pubkey,              // The investor's public key
    pub fundraiser: Pubkey,            // The fundraiser's public key
    pub investment_counter: u64,       // Counter for investments in THIS fundraiser by THIS investor
    pub bump: u8,                      // PDA bump seed
}

/// Represents an individual investment in a fundraiser
/// Seeds: [b"investment", investor_pubkey, fundraiser_pubkey, investment_counter]
///         Counter now comes from InvestorFundraiser PDA instead of Investor PDA
#[account]
#[derive(InitSpace)]
pub struct Investment {
    pub investor: Pubkey, // The public key of the investor
    pub fundraiser: Pubkey, // The public key of the fundraiser PDA
    pub usdc_amount: u64, // The amount of USDC invested
    pub reit_amount: u32, // The amount of REIT tokens to be minted for this investment - changed from u64
    pub status: InvestmentStatus,
    pub bump: u8, // PDA bump seed for the investment account
}

/// Investment lifecycle status stored on-chain as a small enum.
/// We keep explicit discriminants for deterministic storage.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum InvestmentStatus {
    Pending = 0,
    Released = 1,
    Refunded = 2,
    Wired = 3,
    ShareIssued = 4,
    ShareSold = 5,
}