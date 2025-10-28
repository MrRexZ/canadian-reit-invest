use anchor_lang::prelude::*;

use crate::state;

pub fn handler(ctx: Context<InitializeInvestor>) -> Result<()> {
    msg!("InitializeInvestor handler start");

    let investor = &mut ctx.accounts.investor;
    investor.investor_pubkey = ctx.accounts.signer.key();
    investor.bump = ctx.bumps.investor;

    msg!("InitializeInvestor handler complete");

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeInvestor<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + state::Investor::INIT_SPACE,
        seeds = [b"investor", signer.key().as_ref()],
        bump
    )]
    pub investor: Account<'info, state::Investor>,

    pub system_program: Program<'info, System>,
}
