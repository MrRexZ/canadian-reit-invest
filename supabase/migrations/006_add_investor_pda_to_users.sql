-- Add investor_pda column to users table
-- For investor type: stores the Solana PDA for the investor account (seeds: [b"investor", investor_pubkey])
-- For admin type: NULL
ALTER TABLE users ADD COLUMN investor_pda TEXT UNIQUE;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN users.investor_pda IS 'Solana program-derived address (PDA) for the investor account. Only populated for investor role; null for admin. Seeds: [b"investor", investor_pubkey]';