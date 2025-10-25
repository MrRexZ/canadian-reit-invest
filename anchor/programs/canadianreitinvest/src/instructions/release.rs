use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;

use crate::state;

pub fn handler(ctx: Context<Release>, reit_id_hash: [u8; 16]) -> Result<()> {
    msg!("Release handler start");

    let investment = &mut ctx.accounts.investment;

    // Verify investment is in pending status
    if investment.status != state::InvestmentStatus::Pending as u8 {
        return Err(error!(crate::errors::CustomError::InvalidInvestmentStatus));
    }

    // Verify admin is the signer
    if ctx.accounts.admin.key() != ctx.accounts.fundraiser.admin {
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Transfer USDC from escrow vault to admin's ATA
    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_vault.to_account_info(),
        to: ctx.accounts.admin_usdc_ata.to_account_info(),
        authority: ctx.accounts.fundraiser.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();

    // Sign with fundraiser PDA seeds
    let seeds = &[
        b"fundraiser",
        reit_id_hash.as_slice(),
        &[ctx.accounts.fundraiser.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, investment.usdc_amount)?;

    // Update investment status to Released
    investment.status = state::InvestmentStatus::Released as u8;

    // Update fundraiser released amount
    let fundraiser = &mut ctx.accounts.fundraiser;
    fundraiser.released_amount = fundraiser
        .released_amount
        .checked_add(investment.usdc_amount)
        .ok_or(error!(crate::errors::CustomError::ArithmeticOverflow))?;

    msg!("Release handler complete");

    Ok(())
}

#[derive(Accounts)]
#[instruction(reit_id_hash: [u8; 16])]
pub struct Release<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: derived in constraint
    #[account(
        mut,
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(mut, constraint = investment.fundraiser == fundraiser.key())]
    pub investment: Account<'info, state::Investment>,

    /// Admin's USDC ATA
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = admin,
    )]
    pub admin_usdc_ata: Account<'info, TokenAccount>,

    /// USDC mint (must match fundraiser.usdc_mint)
    #[account(constraint = usdc_mint.key() == fundraiser.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    #[account(mut, constraint = escrow_vault.key() == fundraiser.escrow_vault)]
    pub escrow_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}