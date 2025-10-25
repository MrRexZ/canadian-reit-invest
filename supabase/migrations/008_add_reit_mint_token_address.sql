-- Add reit_mint_token_address column to reits table
ALTER TABLE reits ADD COLUMN reit_mint_token_address TEXT;

-- Add comment for the new column
COMMENT ON COLUMN reits.reit_mint_token_address IS 'The Solana public key of the REIT mint token';