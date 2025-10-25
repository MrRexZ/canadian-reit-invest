use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token};

use crate::state;

pub fn handler(ctx: Context<CreateMint>, reit_id_hash: [u8; 16], share_price: u64, currency: String) -> Result<()> {
    msg!("Create mint handler start");
    msg!("Admin: {}", ctx.accounts.admin.key());
    msg!("Fundraiser: {}", ctx.accounts.fundraiser.key());
    msg!("Share price: {}, Currency: {}", share_price, currency);

    // Verify admin is the signer and matches fundraiser admin
    if ctx.accounts.admin.key() != ctx.accounts.fundraiser.admin {
        msg!("ERROR: Admin {} is not the fundraiser admin {}", ctx.accounts.admin.key(), ctx.accounts.fundraiser.admin);
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Create the mint
    token::initialize_mint(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::InitializeMint {
                mint: ctx.accounts.reit_mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        ),
        0, // 0 decimals for REIT shares
        &ctx.accounts.admin.key(),
        Some(&ctx.accounts.admin.key()),
    )?;

    // Update fundraiser with mint address
    let fundraiser = &mut ctx.accounts.fundraiser;
    fundraiser.reit_mint = ctx.accounts.reit_mint.key();

    msg!("REIT mint created successfully: {}", ctx.accounts.reit_mint.key());
    msg!("Create mint handler complete");

    Ok(())
}

#[derive(Accounts)]
#[instruction(reit_id_hash: [u8; 16], share_price: u64, currency: String)]
pub struct CreateMint<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 0,
        mint::authority = admin,
        mint::freeze_authority = admin,
    )]
    pub reit_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}