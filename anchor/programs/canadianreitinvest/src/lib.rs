use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("HKE3kVkw621wdSJmsaZxHxLK1TaHQevvGAUh9Z3YxH7B");

mod state;
mod errors;
mod instructions;

#[program]
pub mod canadianreitinvest {
    use super::*;

    pub fn initialize_fundraiser(ctx: Context<InitializeFundraiser>, reit_id: String) -> Result<()> {
        let fundraiser = &mut ctx.accounts.fundraiser;
        fundraiser.admin = ctx.accounts.admin.key();
        fundraiser.reit_id = reit_id.clone();
        fundraiser.token_metadata = ctx.accounts.token_metadata.key();
        fundraiser.escrow_vault = ctx.accounts.escrow_vault.key();
        fundraiser.total_raised = 0;
        fundraiser.total_released = 0;
        fundraiser.investment_counter = 0;
        fundraiser.bump = ctx.bumps.fundraiser;

        let token_metadata = &mut ctx.accounts.token_metadata;
        token_metadata.mint = Pubkey::default();
        token_metadata.update_authority = ctx.accounts.admin.key();
        token_metadata.name = format!("REIT {} Token", reit_id);
        token_metadata.symbol = "REIT".to_string();
        token_metadata.uri = "".to_string();

        Ok(())
    }
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
        space = 8 + std::mem::size_of::<state::MetaplexTokenMetadata>(),
        seeds = [b"token_metadata", reit_id.as_bytes()],
        bump
    )]
    pub token_metadata: Account<'info, state::MetaplexTokenMetadata>,

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
