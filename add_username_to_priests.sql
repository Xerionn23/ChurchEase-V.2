-- Add username and password_hash columns to priests table
-- This allows priests to create accounts directly in the priests table

ALTER TABLE priests 
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Create index for username
CREATE INDEX IF NOT EXISTS idx_priests_username ON priests(username);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added username, password_hash, and email_verified columns to priests table!';
    RAISE NOTICE '✅ Priests can now create accounts directly!';
END $$;
