use anchor_lang::prelude::*;

declare_id!("HKE3kVkw621wdSJmsaZxHxLK1TaHQevvGAUh9Z3YxH7B");

mod state;
mod errors;
mod instructions;

use instructions::initialize::*;
use instructions::initialize_investor::*;
use instructions::invest::*;

#[program]
pub mod canadianreitinvest {
    use super::*;

    pub fn initialize_fundraiser(ctx: Context<InitializeFundraiser>, reit_id: String, reit_id_hash: [u8; 16]) -> Result<()> {
        instructions::initialize::handler(ctx, reit_id, reit_id_hash)
    }

    pub fn initialize_investor(ctx: Context<InitializeInvestor>) -> Result<()> {
        instructions::initialize_investor::handler(ctx)
    }

    pub fn invest(ctx: Context<Invest>, amount: u64, reit_id_hash: [u8; 16]) -> Result<()> {
        instructions::invest::handler(ctx, amount, reit_id_hash)
    }
}
