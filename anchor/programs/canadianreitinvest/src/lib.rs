use anchor_lang::prelude::*;

declare_id!("HKE3kVkw621wdSJmsaZxHxLK1TaHQevvGAUh9Z3YxH7B");

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
