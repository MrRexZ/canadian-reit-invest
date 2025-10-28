use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, TransferChecked};

use crate::state;

pub fn handler(ctx: Context<Refund>, reit_id_hash: [u8; 16]) -> Result<()> {
    msg!("Refund handler start");
    msg!("Admin: {}", ctx.accounts.admin.key());
    msg!("Investment: {}", ctx.accounts.investment.key());
    msg!("REIT ID hash: {:?}", reit_id_hash);

    let investment = &mut ctx.accounts.investment;
    msg!("Investment data - Investor: {}, Amount: {}, Status: {:?}", investment.investor, investment.usdc_amount, investment.status);

    // Verify investment is in released status
    if investment.status != state::InvestmentStatus::Released {
        msg!("ERROR: Investment status is not released. Current status: {:?}", investment.status);
        return Err(error!(crate::errors::CustomError::InvalidInvestmentStatus));
    }

    // Verify admin is the signer and matches fundraiser admin
    if ctx.accounts.admin.key() != ctx.accounts.fundraiser.admin {
        msg!("ERROR: Admin {} is not the fundraiser admin {}", ctx.accounts.admin.key(), ctx.accounts.fundraiser.admin);
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Validate investor matches investment
    if ctx.accounts.investor.key() != investment.investor {
        msg!("ERROR: Investor account {} does not match investment investor {}", ctx.accounts.investor.key(), investment.investor);
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Transfer USDC from admin to investor using token::transfer_checked
    let transfer_amount = investment.usdc_amount;
    msg!("Transferring {} USDC from admin to investor", transfer_amount);

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.admin_usdc_ata.to_account_info(),
        to: ctx.accounts.investor_usdc_ata.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
        mint: ctx.accounts.usdc_mint.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

    // USDC has 6 decimals
    token::transfer_checked(cpi_context, transfer_amount, ctx.accounts.usdc_mint.decimals)?;

    msg!("USDC transfer completed successfully");

    // Update investment status to Refunded
    investment.status = state::InvestmentStatus::Refunded;
    msg!("Investment status updated to Refunded (status: {:?})", investment.status);

    msg!("Refund handler complete - transaction successful");

    Ok(())
}

#[derive(Accounts)]
#[instruction(reit_id_hash: [u8; 16])]
pub struct Refund<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: derived in constraint
    #[account(
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(mut, constraint = investment.fundraiser == fundraiser.key())]
    pub investment: Account<'info, state::Investment>,

    /// Investor receiving the refund (derived from investment)
    /// CHECK: Validated via investment.investor field
    pub investor: UncheckedAccount<'info>,

    /// Admin's USDC token account (source of refund)
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = admin
    )]
    pub admin_usdc_ata: Account<'info, TokenAccount>,

    /// Investor's USDC token account (destination for refund)
    #[account(
        mut,
        token::mint = usdc_mint,
        constraint = investor_usdc_ata.owner == investor.key()
    )]
    pub investor_usdc_ata: Account<'info, TokenAccount>,

    /// USDC mint for validation
    #[account(
        constraint = usdc_mint.key() == fundraiser.usdc_mint
    )]
    pub usdc_mint: Account<'info, Mint>,

    /// Token program for transfer
    pub token_program: Program<'info, Token>,
}