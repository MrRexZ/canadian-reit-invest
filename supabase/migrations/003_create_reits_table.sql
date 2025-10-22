-- Create the reits table
CREATE TABLE reits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reit_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE reits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read reits
CREATE POLICY "reits_read_all" ON reits
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow admin users to insert/update reits
CREATE POLICY "reits_admin_write" ON reits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role = 'admin'
    )
  );