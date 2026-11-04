-- Create the profiles table
-- This table stores additional user profile information
-- References auth.users(id) with ON DELETE CASCADE

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle user metadata on signup
-- This trigger extracts name and username from raw_user_meta_data
-- and inserts a profile record when a new user is created

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile using data from raw_user_meta_data
  -- This is called after auth.users insert via trigger
  INSERT INTO profiles (id, name, username, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    NEW.created_at
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username already exists - silently fail or log
    -- The signup will fail with a proper error message
    RETURN NULL;
  WHEN others THEN
    -- Log error but don't block the signup
    -- The user can still register, profile may be missing
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for new signups
-- This trigger fires after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();