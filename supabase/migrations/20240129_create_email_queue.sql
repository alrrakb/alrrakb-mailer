-- Create Email Queue Table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  recipient_email TEXT NOT NULL,
  subject TEXT,
  body_html TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  attempts INT DEFAULT 0,
  last_error TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_email TEXT -- Optional: for multi-tenant matching
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_user_email ON email_queue(user_email);

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Policies (Permissive for now to allow API access)
CREATE POLICY "Allow Service Role Full Access" ON email_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can insert their own emails" ON email_queue FOR INSERT WITH CHECK (true); 
CREATE POLICY "Users can view their own emails" ON email_queue FOR SELECT USING (true);
-- Note: 'true' policies are temporary/broad for development to avoid blocking the Admin API which might not have perfect auth context in 'cron' calls.
-- Ideally: auth.uid() = user_id or similar.
