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
    #[max_len(32)]
    pub reit_id: String, // Unique identifier for the REIT fundraiser (used in PDA seeds)
    pub investment_counter: u64, // Counter for generating unique investment PDA seeds
    pub bump: u8, // PDA bump seed for the fundraiser account
    // Flattened ReitMintMetadata fields
    pub share_price: u64, // Share price in USDC (used for dividend and investment calculations)
    pub reit_token_decimals: u8, // Number of decimals for REIT tokens
    #[max_len(3)]
    pub reit_accepted_currency: String, // Currency code for the REIT (e.g., "CAD")
}

/// Represents an individual investment in a fundraiser
#[account]
#[derive(InitSpace)]
pub struct Investment {
    pub investor: Pubkey, // The public key of the investor
    pub fundraiser: Pubkey, // The public key of the fundraiser PDA
    pub usdc_amount: u64, // The amount of USDC invested
    pub reit_amount: u64, // The amount of REIT tokens to be minted for this investment
    pub released: bool, // Whether the investment has been released for CAD conversion
    pub refunded: bool, // Whether the investment has been refunded
    pub investment_date: i64, // Timestamp of when the investment was made
    pub bump: u8, // PDA bump seed for the investment account
}