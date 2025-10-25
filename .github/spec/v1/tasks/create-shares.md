# For admin flow only
1. In Browse REIT page, next to each the REIT, add a button to create REIT mint token  (if it doesn't exist) and update it. It'll spawn a popup.
   1. The fields user can modify in the popup are: `Share price`, `currency`. Use metaplex to store this as PDA of the Mint Token.
   2. Create a `reit_token_address` field in REIT Supabase table pointing to the reference.
2. In Browse Investment, next to investment already Wired, enable a button called "Issue Share"
   1. When clicked, it'll mint a token to the investor's wallet associated to the investment. The number of token to give will depend on the share price and the amount the user invested, calculate it.