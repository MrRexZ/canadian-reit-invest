use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state;

#[derive(Accounts)]
#[instruction(reit_id: String)]
pub struct InitializeFundraiser<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<state::Fundraiser>(),
        seeds = [b"fundraiser", admin.key().as_ref(), reit_id.as_bytes()],
        bump
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub token_metadata: Account<'info, state::MetaplexTokenMetadata>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = fundraiser,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}