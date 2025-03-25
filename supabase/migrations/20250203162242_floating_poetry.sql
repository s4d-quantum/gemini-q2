/*
  # Add user creation trigger

  1. Changes
    - Add trigger to automatically create user record when auth.users is updated
    - Ensure user record exists before device creation
    
  2. Security
    - Maintains RLS protection
    - Automatically syncs auth users with application users
*/

-- Create trigger function for user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create existing users
INSERT INTO public.users (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), 'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
