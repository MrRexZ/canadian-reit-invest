use anchor_lang::prelude::*;

declare_id!("7s6k4nDF8z1hbHMxGeDqovfjqUG28L4ikjMVY6DQVm6B");

#[program]
pub mod canadianreitinvest {
    use super::*;

    pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
        msg!("GM!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
