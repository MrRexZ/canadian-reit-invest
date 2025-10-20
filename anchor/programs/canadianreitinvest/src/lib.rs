use anchor_lang::prelude::*;

declare_id!("HKE3kVkw621wdSJmsaZxHxLK1TaHQevvGAUh9Z3YxH7B");

mod state;
mod errors;
mod instructions;

use instructions::initialize::*;

#[program]
pub mod canadianreitinvest {
    use super::*;

    pub fn initialize_fundraiser(ctx: Context<InitializeFundraiser>, reit_id: String) -> Result<()> {
        instructions::initialize::handler(ctx, reit_id)
    }
}
