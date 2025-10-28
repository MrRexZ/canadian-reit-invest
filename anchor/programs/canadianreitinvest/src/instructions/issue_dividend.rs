use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, TransferChecked};

use crate::state::{Investment, InvestmentStatus, Fundraiser};
use crate::errors::CustomError;

/// Simple V1 dividend distribution instruction
/// Transfers USDC from admin ATA to investor ATA
/// Does NOT create any PDAs for tracking
/// Event is emitted for off-chain audit trail
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct IssueDividend<'info> {
    /// Admin who signs and authorizes the dividend payment
    #[account(mut, signer)]
    pub admin: Signer<'info>,

    /// Investment PDA to validate investor eligibility
    /// Must have ShareIssued status
    #[account(
        constraint = investment.status == InvestmentStatus::ShareIssued @ CustomError::InvalidInvestmentStatus,
        constraint = fundraiser.key() == investment.fundraiser @ CustomError::InvalidFundraiserMismatch
    )]
    pub investment: Account<'info, Investment>,

    /// Investor receiving the dividend (derived from investment)
    /// CHECK: Validated via investment.investor field
    pub investor: UncheckedAccount<'info>,

    /// Fundraiser PDA for admin authorization check
    #[account(
        constraint = admin.key() == fundraiser.admin @ CustomError::InvalidAuthority
    )]
    pub fundraiser: Account<'info, Fundraiser>,

    /// Admin's USDC token account (source of dividend)
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = admin
    )]
    pub admin_usdc_ata: Account<'info, TokenAccount>,

    /// Investor's USDC token account (destination for dividend)
    #[account(
        mut,
        token::mint = usdc_mint,
        constraint = investor_usdc_ata.owner == investor.key() @ CustomError::InvalidAuthority
    )]
    pub investor_usdc_ata: Account<'info, TokenAccount>,

    /// USDC mint for validation
    #[account(
        constraint = usdc_mint.key() == fundraiser.usdc_mint @ CustomError::InvalidMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    /// Token program for transfer
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<IssueDividend>, amount: u64) -> Result<()> {
    // Validate investment has ShareIssued status (redundant with constraint but explicit)
    require!(
        ctx.accounts.investment.status == InvestmentStatus::ShareIssued,
        CustomError::InvalidInvestmentStatus
    );

    // Validate investment investor matches the investor account
    require!(
        ctx.accounts.investment.investor == ctx.accounts.investor.key(),
        CustomError::InvalidInvestmentStatus
    );

    // Transfer USDC from admin to investor using token::transfer_checked
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.admin_usdc_ata.to_account_info(),
        to: ctx.accounts.investor_usdc_ata.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
        mint: ctx.accounts.usdc_mint.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

    // USDC has 6 decimals
    token::transfer_checked(cpi_context, amount, ctx.accounts.usdc_mint.decimals)?;

    // Emit event for off-chain tracking and audit trail
    emit!(DividendIssued {
        investment: ctx.accounts.investment.key(),
        investor: ctx.accounts.investor.key(),
        fundraiser: ctx.accounts.fundraiser.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Event emitted when dividend is issued
/// Provides permanent audit trail on Solana blockchain
#[event]
pub struct DividendIssued {
    pub investment: Pubkey,
    pub investor: Pubkey,
    pub fundraiser: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
