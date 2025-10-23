use anchor_lang::prelude::*;

use crate::state;

pub fn handler(ctx: Context<InitializeInvestor>) -> Result<()> {
    msg!("InitializeInvestor handler start");

    let investor_account = &mut ctx.accounts.investor_account;
    investor_account.investor = ctx.accounts.investor.key();
    investor_account.bump = ctx.bumps.investor_account;
    investor_account.investment_counter = 0;

    msg!("InitializeInvestor handler complete - investor: {}", investor_account.investor.to_string());

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeInvestor<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    /// Investor account to track investment counter
    #[account(
        init,
        payer = investor,
        space = 8 + state::Investor::INIT_SPACE,
        seeds = [b"investor", investor.key().as_ref()],
        bump
    )]
    pub investor_account: Account<'info, state::Investor>,

    pub system_program: Program<'info, System>,
}
