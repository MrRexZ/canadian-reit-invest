use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

use crate::state;

pub fn handler(ctx: Context<IssueShare>, reit_id_hash: [u8; 16]) -> Result<()> {
    msg!("Issue share handler start");
    msg!("Admin: {}", ctx.accounts.admin.key());
    msg!("Investment: {}", ctx.accounts.investment.key());
    msg!("REIT mint: {}", ctx.accounts.reit_mint.key());

    let investment = &mut ctx.accounts.investment;
    msg!("Investment data - Investor: {}, Amount: {}, Status: {:?}", investment.investor, investment.usdc_amount, investment.status);

    // Verify investment is in wired status
    if investment.status != state::InvestmentStatus::Wired {
        msg!("ERROR: Investment status is not wired. Current status: {:?}", investment.status);
        return Err(error!(crate::errors::CustomError::InvalidInvestmentStatus));
    }

    // Verify admin is the signer and matches fundraiser admin
    if ctx.accounts.admin.key() != ctx.accounts.fundraiser.admin {
        msg!("ERROR: Admin {} is not the fundraiser admin {}", ctx.accounts.admin.key(), ctx.accounts.fundraiser.admin);
        return Err(error!(crate::errors::CustomError::InvalidAuthority));
    }

    // Calculate REIT amount: usdc_amount / share_price
    // For now, assume share_price is stored somewhere. TODO: Add share_price to fundraiser or metadata
    let share_price = 100_000_000; // 100 USDC in smallest units, TODO: Get from metadata
    let reit_amount = (investment.usdc_amount / share_price) as u32;

    msg!("Calculated REIT amount: {} (usdc: {}, price: {})", reit_amount, investment.usdc_amount, share_price);

    // Mint tokens to investor's ATA
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.reit_mint.to_account_info(),
                to: ctx.accounts.investor_ata.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
            &[],
        ),
        reit_amount as u64,
    )?;

    // Update investment
    investment.reit_amount = reit_amount;
    investment.status = state::InvestmentStatus::ShareIssued;

    msg!("Minted {} REIT tokens to {}", reit_amount, ctx.accounts.investor_ata.key());
    msg!("Investment status updated to ShareIssued");
    msg!("Issue share handler complete");

    Ok(())
}

#[derive(Accounts)]
#[instruction(reit_id_hash: [u8; 16])]
pub struct IssueShare<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: derived in constraint
    #[account(
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(mut, constraint = investment.fundraiser == fundraiser.key())]
    pub investment: Account<'info, state::Investment>,

    #[account(mut, address = fundraiser.reit_mint)]
    pub reit_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = reit_mint,
        token::authority = investment.investor,
    )]
    pub investor_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}