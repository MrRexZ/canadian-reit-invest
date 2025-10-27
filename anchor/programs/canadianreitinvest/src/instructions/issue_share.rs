use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;

use crate::state;

pub fn handler(ctx: Context<IssueShare>, investor_pubkey: Pubkey, _reit_id_hash: [u8; 16], share_price: u64) -> Result<()> {
    msg!("Issue share handler start");
    
    // Validate that the investor_wallet account matches the investor_pubkey parameter
    require_keys_eq!(
        ctx.accounts.investor_wallet.key(),
        investor_pubkey,
        crate::errors::CustomError::InvalidAuthority
    );
    
    msg!("Admin: {}", ctx.accounts.admin.key());
    msg!("Investment: {}", ctx.accounts.investment.key());
    msg!("REIT mint: {}", ctx.accounts.reit_mint.key());
    msg!("Fundraiser: {}", ctx.accounts.fundraiser.key());
    msg!("Fundraiser REIT mint: {}", ctx.accounts.fundraiser.reit_mint);
    
    // Validate reit_mint is owned by Token Program
    let token_program_id = anchor_spl::token::ID;
    msg!("Token Program ID: {}", token_program_id);
    msg!("REIT mint owner: {}", ctx.accounts.reit_mint.to_account_info().owner);
    
    if ctx.accounts.reit_mint.to_account_info().owner != &token_program_id {
        msg!("ERROR: REIT mint not owned by Token Program!");
        msg!("Expected: {}", token_program_id);
        msg!("Got: {}", ctx.accounts.reit_mint.to_account_info().owner);
        return Err(error!(crate::errors::CustomError::InvalidInvestmentStatus));
    }
    
    msg!("REIT mint account lamports: {}", ctx.accounts.reit_mint.to_account_info().lamports());
    msg!("REIT mint account data len: {}", ctx.accounts.reit_mint.to_account_info().data.borrow().len());

    let investment = &mut ctx.accounts.investment;
    msg!("Investment data - Investor: {}, Amount: {}, Status: {:?}", investment.investor, investment.usdc_amount, investment.status);
    msg!("Investment fundraiser link: {}", investment.fundraiser);
    msg!("Checking if fundraiser matches - expected: {}, actual: {}", ctx.accounts.fundraiser.key(), investment.fundraiser);

    // Verify investment is in wired status
    if investment.status != state::InvestmentStatus::Wired {
        msg!("ERROR: Investment status is not wired. Current status: {:?}", investment.status);
        return Err(error!(crate::errors::CustomError::InvalidInvestmentStatus));
    }

    // Calculate REIT amount: usdc_amount / share_price
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
#[instruction(investor_pubkey: Pubkey, reit_id_hash: [u8; 16], share_price: u64)]
pub struct IssueShare<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"fundraiser", reit_id_hash.as_slice()],
        bump = fundraiser.bump,
    )]
    pub fundraiser: Account<'info, state::Fundraiser>,

    #[account(mut, constraint = investment.fundraiser == fundraiser.key())]
    pub investment: Account<'info, state::Investment>,

    #[account(
        seeds = [b"investor", investor_pubkey.as_ref()],
        bump = investor.bump,
    )]
    pub investor: Account<'info, state::Investor>,

    /// Investor wallet - needed as the ATA authority (not a signer for this instruction)
    /// CHECK: investor_pubkey parameter validates this
    pub investor_wallet: UncheckedAccount<'info>,

    #[account(mut)]
    pub reit_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = reit_mint,
        associated_token::authority = investor_wallet,
        associated_token::token_program = token_program,
    )]
    pub investor_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}