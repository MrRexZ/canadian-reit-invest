use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state;

pub fn handler(ctx: Context<InitializeFundraiser>, reit_id: String) -> Result<()> {
    let fundraiser = &mut ctx.accounts.fundraiser;
    fundraiser.admin = ctx.accounts.admin.key();
    fundraiser.usdc_mint = ctx.accounts.usdc_mint.key();
    fundraiser.reit_mint = Pubkey::default();
    fundraiser.escrow_vault = ctx.accounts.escrow_vault.key();
    fundraiser.total_raised = 0;
    fundraiser.released_amount = 0;
    fundraiser.reit_id = reit_id.clone();
    fundraiser.investment_counter = 0;
    fundraiser.bump = ctx.bumps.fundraiser;
    // Flattened metadata
    fundraiser.share_price = 0; // To be set later by admin
    fundraiser.reit_token_decimals = 6;
    fundraiser.reit_accepted_currency = "CAD".to_string();

    Ok(())
}

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

    #[account(
        init,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = fundraiser,
        seeds = [b"escrow_vault", fundraiser.key().as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}