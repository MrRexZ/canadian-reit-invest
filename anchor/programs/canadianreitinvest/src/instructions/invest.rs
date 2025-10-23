use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state;

pub fn handler(ctx: Context<Invest>, amount: u64, _reit_id_hash: [u8; 16]) -> Result<()> {
    msg!("Invest handler start");

    if amount == 0 {
        return Err(error!(crate::errors::CustomError::InvalidAmount));
    }

    let fundraiser = &mut ctx.accounts.fundraiser;

    // Verify escrow vault matches fundraiser. This will be enforced by constraints as well.
    if ctx.accounts.escrow_vault.key() != fundraiser.escrow_vault {
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Transfer USDC from investor to escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.investor_usdc_ata.to_account_info(),
        to: ctx.accounts.escrow_vault.to_account_info(),
        authority: ctx.accounts.investor.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Initialize investment account
    let investment = &mut ctx.accounts.investment;
    investment.investor = ctx.accounts.investor.key();
    investment.fundraiser = fundraiser.key();
    investment.usdc_amount = amount;
    investment.reit_amount = 0;
    investment.released = false;
    investment.refunded = false;
    investment.investment_date = Clock::get()?.unix_timestamp;
    investment.bump = ctx.bumps.investment;

    // Update fundraiser counters
    fundraiser.investment_counter = fundraiser
        .investment_counter
        .checked_add(1)
        .ok_or(error!(crate::errors::CustomError::InvestmentCounterOverflow))?;

    fundraiser.total_raised = fundraiser
        .total_raised
        .checked_add(amount)
        .ok_or(error!(crate::errors::CustomError::ArithmeticOverflow))?;

    msg!("Invest handler complete");

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, reit_id_hash: [u8; 16])]
pub struct Invest<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    /// CHECK: derived in constraint
    #[account(
        mut,
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(
        init,
        payer = investor,
        space = 8 + state::Investment::INIT_SPACE,
        seeds = [b"investment", investor.key().as_ref(), fundraiser.key().as_ref(), &fundraiser.investment_counter.to_le_bytes()],
        bump
    )]
    pub investment: Account<'info, state::Investment>,

    #[account(mut, token::mint = fundraiser.usdc_mint, constraint = investor_usdc_ata.owner == investor.key())]
    pub investor_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, constraint = escrow_vault.key() == fundraiser.escrow_vault)]
    pub escrow_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    // pass the reit_id_hash so PDA derivation uses the same bytes
    // reit_id_hash is provided as an instruction argument (see #[instruction(...)])
}
