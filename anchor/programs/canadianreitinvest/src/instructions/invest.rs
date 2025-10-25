use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;

use crate::state;

pub fn handler(ctx: Context<Invest>, amount: u64, _reit_id_hash: [u8; 16]) -> Result<()> {
    msg!("Invest handler start");

    if amount == 0 {
        return Err(error!(crate::errors::CustomError::InvalidAmount));
    }

    let fundraiser = &ctx.accounts.fundraiser;

    // Debug logs for PDA addresses and seeds
    msg!("Fundraiser PDA: {} (seeds: [b\"fundraiser\", reit_id_hash: {:?}])", fundraiser.key(), _reit_id_hash);
    msg!("Investor PDA: {} (seeds: [b\"investor\", investor_signer: {}])", ctx.accounts.investor.key(), ctx.accounts.investor_signer.key());
    msg!("Investment PDA: {} (seeds: [b\"investment\", investor_signer: {}, fundraiser: {}, counter: {}])",
          ctx.accounts.investment.key(),
          ctx.accounts.investor_signer.key(),
          fundraiser.key(),
          ctx.accounts.investor.investment_counter);

    // Verify escrow vault matches fundraiser. This will be enforced by constraints as well.
    if ctx.accounts.escrow_vault.key() != fundraiser.escrow_vault {
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Transfer USDC from investor's ATA to escrow (investor_signer must sign)
    let cpi_accounts = Transfer {
        from: ctx.accounts.investor_usdc_ata.to_account_info(),
        to: ctx.accounts.escrow_vault.to_account_info(),
        authority: ctx.accounts.investor_signer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Initialize investor account if newly created
    let investor = &mut ctx.accounts.investor;
    if investor.investor_pubkey == Pubkey::default() {
        investor.investor_pubkey = ctx.accounts.investor_signer.key();
        investor.investment_counter = 0;
        investor.bump = ctx.bumps.investor;
    }

    // Update investor counter
    investor.investment_counter = investor
        .investment_counter
        .checked_add(1)
        .ok_or(error!(crate::errors::CustomError::InvestmentCounterOverflow))?;

    // Initialize investment account
    let investment = &mut ctx.accounts.investment;
    investment.investor = ctx.accounts.investor_signer.key();
    investment.fundraiser = fundraiser.key();
    investment.usdc_amount = amount;
    investment.reit_amount = 0;
    // set status to Pending
    investment.status = state::InvestmentStatus::Pending;
    investment.bump = ctx.bumps.investment;

    // Update fundraiser total raised
    let fundraiser = &mut ctx.accounts.fundraiser;
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
    pub investor_signer: Signer<'info>,

    /// Investor PDA: init if needed so users don't have to pre-create it
    #[account(
        init_if_needed,
        payer = investor_signer,
        space = 8 + state::Investor::INIT_SPACE,
        seeds = [b"investor", investor_signer.key().as_ref()],
        bump
    )]
    pub investor: Account<'info, state::Investor>,

    /// CHECK: derived in constraint
    #[account(
        mut,
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(
        init,
        payer = investor_signer,
        space = 8 + state::Investment::INIT_SPACE,
        seeds = [b"investment", investor_signer.key().as_ref(), fundraiser.key().as_ref(), &investor.investment_counter.to_le_bytes()],
        bump
    )]
    pub investment: Account<'info, state::Investment>,

    /// Investor's USDC ATA. Create it if missing so users don't have to pre-create their ATA.
    // USDC mint (must match fundraiser.usdc_mint)
    #[account(constraint = usdc_mint.key() == fundraiser.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    /// Investor's USDC ATA. Create it if missing so users don't have to pre-create their ATA.
    #[account(
        init_if_needed,
        payer = investor_signer,
        associated_token::mint = usdc_mint,
        associated_token::authority = investor_signer,
    )]
    pub investor_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, constraint = escrow_vault.key() == fundraiser.escrow_vault)]
    pub escrow_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
