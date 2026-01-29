-- Create Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT,
    subject TEXT,
    body_html TEXT,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy for campaigns (Open for now/Based on service role mainly, but mimicking email_queue)
CREATE POLICY "Allow all access to campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true);

-- Modify email_queue to link to campaigns
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

-- Make heavy columns nullable in email_queue (we will stop using them for new rows)
ALTER TABLE email_queue ALTER COLUMN body_html DROP NOT NULL;
ALTER TABLE email_queue ALTER COLUMN attachments DROP NOT NULL;
ALTER TABLE email_queue ALTER COLUMN subject DROP NOT NULL; -- Optional, can keep for easy stats
