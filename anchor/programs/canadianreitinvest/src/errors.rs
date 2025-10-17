use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Escrow not initialized")]
    EscrowNotInitialized,
    #[msg("Investment counter overflow")]
    InvestmentCounterOverflow,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}