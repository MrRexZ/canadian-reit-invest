-- Create the users table
CREATE TABLE users (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('admin', 'investor')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own row
CREATE POLICY "users_read_own_data" ON users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own row  
CREATE POLICY "users_update_own_data" ON users
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function and trigger to auto-create user as investor on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, role)
  VALUES (NEW.id, 'investor');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();