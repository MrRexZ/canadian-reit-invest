use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state;

pub fn handler(ctx: Context<InitializeFundraiser>, _reit_id: String, _reit_id_hash: [u8; 16]) -> Result<()> {
    // Log entry so we can see the instruction hit in transaction logs
    msg!("InitializeFundraiser handler start");
    msg!("reit_id: {}", _reit_id);
    msg!("reit_id_hash: {:?}", _reit_id_hash);

    // Note: No validation needed here. The PDA is derived from reit_id_hash,
    // so if the hash doesn't match what was used to compute the PDA,
    // the account won't be found or will be incorrect, causing the transaction to fail.

    // Inspect the raw usdc_mint account info (we intentionally use UncheckedAccount
    // in the accounts struct so Anchor does not attempt to deserialize a Mint
    // before we can log and provide a helpful error message).
    let usdc_ai = &ctx.accounts.usdc_mint.to_account_info();
    msg!("usdc_mint key: {}", usdc_ai.key);
    msg!("usdc_mint owner: {}", usdc_ai.owner);
    // lamports is a RefCell; borrow to log
    msg!("usdc_mint lamports: {}", usdc_ai.lamports.borrow());
    match usdc_ai.try_borrow_data() {
        Ok(data) => {
            msg!("usdc_mint data len: {}", data.len());
            // Log first 16 bytes in hex to help identify account type in logs
            let sample_len = core::cmp::min(16usize, data.len());
            let mut hex_buf = String::new();
            for b in &data[0..sample_len] {
                use core::fmt::Write;
                write!(hex_buf, "{:02x}", b).ok();
            }
            msg!("usdc_mint data sample (hex): {}", hex_buf);
        }
        Err(_) => {
            msg!("unable to borrow usdc_mint data");
        }
    }

    let fundraiser = &mut ctx.accounts.fundraiser;
    fundraiser.admin = ctx.accounts.admin.key();
    fundraiser.usdc_mint = ctx.accounts.usdc_mint.key();
    fundraiser.reit_mint = Pubkey::default();
    fundraiser.escrow_vault = ctx.accounts.escrow_vault.key();
    fundraiser.total_raised = 0;
    fundraiser.released_amount = 0;
    fundraiser.bump = ctx.bumps.fundraiser;
    fundraiser.reit_accepted_currency = *b"CAD";

    msg!("InitializeFundraiser handler complete");

    Ok(())
}

#[derive(Accounts)]
#[instruction(reit_id: String, reit_id_hash: [u8; 16])]
pub struct InitializeFundraiser<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + state::Fundraiser::INIT_SPACE,
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = fundraiser,
        seeds = [b"escrow_vault", fundraiser.key().as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}