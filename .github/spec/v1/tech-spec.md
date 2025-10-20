### Flow

1. **Invest**: User sends USDC to the escrow vault. A new Investor State PDA is created for each investment, recording the amount, with the PDA address as `investment_id`. `reit_amount` is set to 0 and `investment_date` is set.
2. **Update Investment**: User sends additional USDC, creating a new Investor State PDA.
3. **Release and Convert**: Admin releases total USDC from all unreleased Investor State PDAs to Admin USDC ATA, initiating off-chain CAD conversion and wiring to the REIT.
4. **Confirm and Mint**: After off-chain CAD wiring success, admin mints REIT tokens (with share price in metadata) to user’s REIT ATA based on each PDA’s amount, updating `reit_amount`.
5. **Refund**: If off-chain wiring fails, USDC is returned from Admin USDC ATA (or escrow if not released) to the user.
6. **Dividend Payout**: After a period (e.g., quarterly), REIT admin distribute dividends, converting REIT profits to USDC via off-chain service, then transfers to user’s USDC ATA proportional to `reit_amount` and prorated by holding period.

### Account Roles and Schemas

- **Fundraiser PDA**:
    - **Role**: Manages fundraiser config, tracks total raised and released USDC, authorizes minting and release, increments investment_counter.
    - **Schema**
        
        ```json
        #[account]
        pub struct Fundraiser {
                pub admin: Pubkey,         // Admin key
                pub usdc_mint: Pubkey,     // USDC mint
                pub reit_mint: Pubkey,     // REIT token mint
                pub escrow_vault: Pubkey,  // Escrow token account
                pub total_raised: u64,     // Total USDC raised
                pub released_amount: u64,  // Total USDC released to admin
                pub reit_id: String,       // Unique REIT ID
                pub investment_counter: u64, // Increments for unique PDA derivation
            }
        ```
        
- **Escrow Vault**:
    - **Role**: Holds user USDC until released to Admin USDC ATA.
    - **Schema**: SPL Token Account (mint: USDC, authority: Fundraiser PDA).
- **Investment PDA**:
    - **Role**: Tracks individual investment entries, multiple PDAs per investor, identified by PDA address as investment_id.
    - **Schema**
        
        ```json
        #[account]
        pub struct Investment {
            pub investor: Pubkey,           // Investor’s public key
            pub fundraiser: Pubkey,     // Linked Fundraiser PDA
            pub amount: u64,            // USDC invested in this entry
            pub reit_amount: u64,       // Minted REIT tokens for this entry (0 until minted)
            pub released: bool,         // True if this investment’s USDC is released
            pub refunded: bool,         // True if this investment has been refunded
            pub investment_date: i64,   // Unix timestamp of investment
        }
        ```
        
        Note: Derived with seeds [b"investment", investor.key(), fundraiser.key(), investment_counter], investment_id is the PDA address.
        
- **REIT Token Mint**:
    - **Role**: Defines REIT tokens, includes share price in metadata.
    - **Schema**: SPL Mint Account (decimals: 6, authority: Fundraiser PDA, metadata with share price).
- **Token Metadata**:
    - **Role**: Stores REIT token details, including share price.
    - **Schema**
        
        ```json
        #[account]
        pub struct ReitMintMetadata {
            pub mint: Pubkey,           // Address of the REIT token mint
            pub share_price: u64,       // Price per share in USDC (e.g., 1000000 = 1 USDC)
            pub decimals: u8,           // Token decimals (e.g., 6)
            pub currency: String,       // Currency code (e.g., "CAD")
        }
        ```
        
- **User USDC ATA**:
    - **Role**: User’s source of USDC for investment and to receives dividends.
    - **Schema**: SPL Token Account (mint: USDC, owner: user).
- **User REIT ATA**:
    - **Role**: Holds user’s minted REIT tokens.
    - **Schema**: SPL Token Account (mint: REIT token, owner: user).
- **Admin USDC ATA**:
    - **Role**: Receives user USDC from escrow to initiate off-chain CAD conversion and wiring.
    - **Schema**: SPL Token Account (mint: USDC, owner: admin).