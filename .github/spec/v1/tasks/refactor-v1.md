1. For the investments table, I only want these fields:
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_pda TEXT NOT NULL UNIQUE, -- Link to on-chain Investment PDA
  investor_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  reit_id UUID,


2. Create the Investor PDA (containing the counter) and change the Investment PDA to use the counter.
3. Update the Invest flow to use the new format.
4. Remove the `investment_counter` at `Fundraiser` object