-- Create minimal investments table
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_pda TEXT NOT NULL UNIQUE,
  investor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reit_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_investments_investor_user ON public.investments(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_investments_reit ON public.investments(reit_id);
CREATE INDEX IF NOT EXISTS idx_investments_pda ON public.investments(investment_pda);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own investments
CREATE POLICY "Users can view own investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = investor_user_id);

-- RLS Policy: Admins can view all investments
CREATE POLICY "Admins can view all investments"
  ON public.investments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Service/app can insert
CREATE POLICY "Service can insert investments"
  ON public.investments FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update their own investments (metadata if needed)
CREATE POLICY "Users can update own investments"
  ON public.investments FOR UPDATE
  USING (auth.uid() = investor_user_id);

-- RLS Policy: Admins can update all
CREATE POLICY "Admins can update all investments"
  ON public.investments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enable real-time for investments
ALTER TABLE public.investments REPLICA IDENTITY FULL;
