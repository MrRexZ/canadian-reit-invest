use anchor_lang::prelude::*;

use crate::state;

pub fn handler(ctx: Context<Wire>, reit_id_hash: [u8; 16]) -> Result<()> {
    msg!("Wire handler start");
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

    // Update investment status to Wired
    investment.status = state::InvestmentStatus::Wired;
    msg!("Investment status updated to Wired (status: {:?})", investment.status);

    msg!("Wire handler complete - transaction successful");

    Ok(())
}

#[derive(Accounts)]
#[instruction(reit_id_hash: [u8; 16])]
pub struct Wire<'info> {
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
}