use anchor_lang::prelude::*;

declare_id!("FuEhMFWU9Ui35a9mpavfy7AYGqEX8diUSk1CZonEUivH");

mod state;
mod errors;
mod instructions;

use instructions::initialize::*;
use instructions::invest::*;
use instructions::initialize_investor::*;
use instructions::close_investor::*;
use instructions::release::*;
use instructions::refund::*;
use instructions::wire::*;

#[program]
pub mod canadianreitinvest {
    use super::*;

    pub fn initialize_fundraiser(ctx: Context<InitializeFundraiser>, reit_id: String, reit_id_hash: [u8; 16]) -> Result<()> {
        instructions::initialize::handler(ctx, reit_id, reit_id_hash)
    }

    pub fn initialize_investor(ctx: Context<InitializeInvestor>) -> Result<()> {
        instructions::initialize_investor::handler(ctx)
    }

    pub fn close_investor(ctx: Context<CloseInvestor>) -> Result<()> {
        instructions::close_investor::handler(ctx)
    }

    pub fn invest(ctx: Context<Invest>, amount: u64, reit_id_hash: [u8; 16]) -> Result<()> {
        instructions::invest::handler(ctx, amount, reit_id_hash)
    }

    pub fn release(ctx: Context<Release>, reit_id_hash: [u8; 16]) -> Result<()> {
        instructions::release::handler(ctx, reit_id_hash)
    }

    pub fn refund(ctx: Context<Refund>, reit_id_hash: [u8; 16]) -> Result<()> {
        instructions::refund::handler(ctx, reit_id_hash)
    }

    pub fn wire(ctx: Context<Wire>, reit_id_hash: [u8; 16]) -> Result<()> {
        instructions::wire::handler(ctx, reit_id_hash)
    }
}
