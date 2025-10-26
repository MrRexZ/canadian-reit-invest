# For admin flow only
1. In Browse REIT page, next to each the REIT, add a button to create REIT Mint token  (if it doesn't exist) and also update it (if the REIT Mint Token already exist ). It'll then spawn a modal.
   1. The fields user can modify in the popup are: `,name` , `symbol`, `description`, `share_price`, `currency`. 
   2. Once confirmed, it'll create a new Mint Token. Use the name and symbol field (and not use share_price and currency for now).
   3. Add a new field to reits table supabase table:  a `reit_mint_token_address` field pointing to the reference of REIT Mint Token Address. 