Check the new migration scripts i just added. don't duplicate work.

1. (already wrote the migration script) Create an investment table in Supabase. For the investments table, I only want these fields:
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_pda TEXT NOT NULL UNIQUE, -- Link to on-chain Investment PDA
  investor_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  reit_id UUID,


2. Create the Investor PDA (containing the counter for the Investment PDA) and change the Investment PDA to use the counter.
3. Update the Invest flow to use the new format.
4. Remove the `investment_counter` and `investment_date` at `Fundraiser` object
5.  Make the reit_pda be stored at reit table too.
6. Make the investor_pda be stored at the user table for the investor. for admin type it's null.
7. Create an investor account only during account signup (regardless if admin or investor role).
8. Implement a view to initialize investor in investor dashboard.