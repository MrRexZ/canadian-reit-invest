use anchor_lang::prelude::*;

use crate::state;

pub fn handler(_ctx: Context<CloseInvestor>) -> Result<()> {
    msg!("CloseInvestor handler start");

    // The close constraint on the investor account will handle the closure
    // and transfer remaining lamports to the signer

    msg!("CloseInvestor handler complete");

    Ok(())
}

#[derive(Accounts)]
pub struct CloseInvestor<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        close = signer,
        seeds = [b"investor", signer.key().as_ref()],
        bump
    )]
    pub investor: Account<'info, state::Investor>,
}
