-- Add 'bounced' column to tracking tables to manage email reputation
-- This column will be set to TRUE by the Resend webhook when a bounce or complaint occurs.

-- 1. Add to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT FALSE;

-- 2. Add to hotels table
ALTER TABLE hotels 
ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT FALSE;

-- 3. (Optional but recommended) Create indices to quickly filter out bounced emails in future queries
CREATE INDEX IF NOT EXISTS idx_contacts_bounced ON contacts(bounced);
CREATE INDEX IF NOT EXISTS idx_hotels_bounced ON hotels(bounced);
