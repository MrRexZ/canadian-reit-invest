1. Implement Investor State PDA with seeds: fundraiser PDA, user pubkey, investment ID (counter from fundraiser).
2. Create invest instruction that:
   - Takes USDC amount from user
   - Transfers USDC to escrow vault
   - Creates Investor State PDA with investment details
   - Increments fundraiser investment_counter
   - Updates fundraiser total_raised
3. Add UI form for users to invest in a fundraiser, selecting amount in USDC.
4. Update dashboard to show user's investments and REIT holdings.
