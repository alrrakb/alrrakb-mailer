-- Optimizing for the specific query: WHERE status='pending' AND campaign_id IN (...) ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_email_queue_process ON email_queue (status, campaign_id, created_at);

-- Optimizing for finding active campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);

-- Ensure Foreign Key index exists (usually good practice)
CREATE INDEX IF NOT EXISTS idx_email_queue_campaign_id ON email_queue (campaign_id);
