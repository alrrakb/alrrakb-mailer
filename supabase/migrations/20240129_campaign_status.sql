-- Add status to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paused'; -- Default to PAUSED so user starts it manually? Or Active? User said "Start" button, implies it starts stopped. Let's default to 'paused'.

-- Update process query to filter by campaign status
-- (This is logic in the route.ts, not SQL function needed usually, unless using RPC for processing)
