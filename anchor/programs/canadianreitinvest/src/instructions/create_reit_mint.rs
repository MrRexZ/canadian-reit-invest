use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use mpl_token_metadata::instructions::CreateV1CpiBuilder;
use mpl_token_metadata::types::TokenStandard;

#[derive(Clone)]
pub struct MetaplexTokenMetadata;

impl anchor_lang::Id for MetaplexTokenMetadata {
    fn id() -> Pubkey {
        mpl_token_metadata::ID
    }
}

use crate::state;

pub fn handler(ctx: Context<CreateReitMint>, reit_id_hash: [u8; 16], name: String, symbol: String, metadata_uri: String) -> Result<()> {
    msg!("Create mint handler start");
    msg!("Admin: {}", ctx.accounts.admin.key());
    msg!("Fundraiser: {}", ctx.accounts.fundraiser.key());
    msg!("Name: {}, Symbol: {}", name, symbol);
    msg!("Metadata URI: {}", metadata_uri);

    // Verify admin is the signer and matches fundraiser admin
    if ctx.accounts.admin.key() != ctx.accounts.fundraiser.admin {
        msg!("ERROR: Admin {} is not the fundraiser admin {}", ctx.accounts.admin.key(), ctx.accounts.fundraiser.admin);
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Update fundraiser with mint address
    let fundraiser = &mut ctx.accounts.fundraiser;
    fundraiser.reit_mint = ctx.accounts.reit_mint.key();

    // Create metadata using Metaplex Token Metadata program
    CreateV1CpiBuilder::new(&ctx.accounts.token_metadata_program)
        .metadata(&ctx.accounts.metadata.to_account_info())
        .mint(&ctx.accounts.reit_mint.to_account_info(), true)
        .authority(&ctx.accounts.admin.to_account_info())
        .update_authority(&ctx.accounts.admin.to_account_info(), true)
        .payer(&ctx.accounts.admin.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .sysvar_instructions(&ctx.accounts.sysvar_instructions.to_account_info())
        .name(name)
        .symbol(symbol)
        .uri(metadata_uri)
        .token_standard(TokenStandard::FungibleAsset)
        .decimals(0)
        .print_supply(mpl_token_metadata::types::PrintSupply::Zero)
        .seller_fee_basis_points(0)
        .invoke()?;

    msg!("Token metadata created successfully");
    msg!("REIT mint created successfully: {}", ctx.accounts.reit_mint.key());
    msg!("Create mint handler complete");

    Ok(())
}

#[derive(Accounts)]
#[instruction(reit_id_hash: [u8; 16], name: String, symbol: String, metadata_uri: String)]
pub struct CreateReitMint<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 0,
        mint::authority = admin,
    )]
    pub reit_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: This is the sysvar instructions account required by Metaplex
    pub sysvar_instructions: UncheckedAccount<'info>, 
    /// CHECK: Metaplex Token Metadata program will validate this
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    pub token_metadata_program: Program<'info, MetaplexTokenMetadata>,
}