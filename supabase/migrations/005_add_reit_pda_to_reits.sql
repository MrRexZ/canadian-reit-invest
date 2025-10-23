-- Add reit_pda column to reits table
ALTER TABLE reits ADD COLUMN reit_pda TEXT UNIQUE;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN reits.reit_pda IS 'Solana program-derived address (PDA) for the fundraiser account, derived from reit_id_hash. Seeds: [b"fundraiser", reit_id_hash]';
