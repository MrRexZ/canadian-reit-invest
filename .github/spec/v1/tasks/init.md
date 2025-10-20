# Offchain Backend Initialization

## Task 1: Set up Supabase project ✅
- Create a new Supabase project at https://supabase.com
- Initialize Supabase CLI: `npm install -g supabase`
- Login to Supabase: `supabase login`
- Link to your project: `supabase link --project-ref YOUR_PROJECT_REF`
- Initialize local development: `supabase init`

## Task 2: Configure Supabase database and authentication ✅
- Set up database schema with table: `investments` (fields: id, user_pubkey, fundraiser_pubkey, pda_address, external_service_transaction_id, status)
- Enable Row Level Security (RLS) on the investments table
- Configure Supabase Auth for user authentication
- Use Supabase client libraries in the frontend: `@supabase/supabase-js`
- For local development, start Supabase: `supabase start`

## Task 3: Frontend Authentication Setup ✅
- Install `@supabase/supabase-js` package
- Create Supabase client configuration in `src/lib/supabase.ts`
- Set up environment variables in `.env` file (not committed to git)
- Create authentication components: `AuthProvider`, `AuthLogin`, `AuthSignup`
- Add protected routes and user dropdown with sign out functionality
- Integrate authentication into the app provider stack