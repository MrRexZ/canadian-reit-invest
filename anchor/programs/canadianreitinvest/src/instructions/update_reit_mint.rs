use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use mpl_token_metadata::instructions::UpdateV1CpiBuilder;

#[derive(Clone)]
pub struct MetaplexTokenMetadata;

impl anchor_lang::Id for MetaplexTokenMetadata {
    fn id() -> Pubkey {
        mpl_token_metadata::ID
    }
}

use crate::state;

pub fn handler(
    ctx: Context<UpdateReitMint>,
    _reit_id_hash: [u8; 16],
    name: String,
    symbol: String,
    metadata_uri: String,
) -> Result<()> {
    msg!("Update mint handler start");
    msg!("Admin: {}", ctx.accounts.admin.key());
    msg!("Fundraiser: {}", ctx.accounts.fundraiser.key());
    msg!("Mint: {}", ctx.accounts.reit_mint.key());
    msg!("Name: {}, Symbol: {}", name, symbol);
    msg!("Metadata URI: {}", metadata_uri);

    // Verify admin is the signer and matches fundraiser admin
    if ctx.accounts.admin.key() != ctx.accounts.fundraiser.admin {
        msg!(
            "ERROR: Admin {} is not the fundraiser admin {}",
            ctx.accounts.admin.key(),
            ctx.accounts.fundraiser.admin
        );
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Verify the mint address matches what's stored in the fundraiser
    if ctx.accounts.reit_mint.key() != ctx.accounts.fundraiser.reit_mint {
        msg!(
            "ERROR: Mint {} does not match fundraiser mint {}",
            ctx.accounts.reit_mint.key(),
            ctx.accounts.fundraiser.reit_mint
        );
        return Err(error!(crate::errors::CustomError::InvalidMint));
    }

    // Update metadata using Metaplex Token Metadata program
    // Note: UpdateV1 uses the Data struct to update fields like name, symbol, and uri
    let data = mpl_token_metadata::types::Data {
        name,
        symbol,
        uri: metadata_uri,
        seller_fee_basis_points: 0,
        creators: None,
    };

    UpdateV1CpiBuilder::new(&ctx.accounts.token_metadata_program)
        .metadata(&ctx.accounts.metadata.to_account_info())
        .mint(&ctx.accounts.reit_mint.to_account_info())
        .authority(&ctx.accounts.admin.to_account_info())
        .new_update_authority(ctx.accounts.admin.key())
        .payer(&ctx.accounts.admin.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .sysvar_instructions(&ctx.accounts.instructions_sysvar.to_account_info())
        .data(data)
        .invoke()?;

    msg!("Token metadata updated successfully");
    msg!("REIT mint updated: {}", ctx.accounts.reit_mint.key());
    msg!("Update mint handler complete");

    Ok(())
}

#[derive(Accounts)]
#[instruction(reit_id_hash: [u8; 16], name: String, symbol: String, metadata_uri: String)]
pub struct UpdateReitMint<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    /// CHECK: Verified that this is the fundraiser's REIT mint
    #[account(mut)]
    pub reit_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,

    /// CHECK: Sysvar instructions account required by Metaplex UpdateV1
    pub instructions_sysvar: UncheckedAccount<'info>,

    /// CHECK: Metaplex Token Metadata program will validate this
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    pub token_metadata_program: Program<'info, MetaplexTokenMetadata>,
}
