use anchor_lang::prelude::*;

#[account]
pub struct Fundraiser {
    pub admin: Pubkey,
    pub reit_id: String,
    pub token_metadata: Pubkey,
    pub escrow_vault: Pubkey,
    pub total_raised: u64,
    pub total_released: u64,
    pub investment_counter: u64,
    pub bump: u8,
}

#[account]
pub struct Investment {
    pub investor: Pubkey,
    pub fundraiser: Pubkey,
    pub amount: u64,
    pub reit_amount: u64,
    pub released: bool,
    pub refunded: bool,
    pub investment_date: i64,
    pub bump: u8,
}

#[account]
pub struct MetaplexTokenMetadata {
    pub mint: Pubkey,
    pub update_authority: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}