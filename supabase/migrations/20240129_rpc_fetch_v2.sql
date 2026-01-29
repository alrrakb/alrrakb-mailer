-- Function to fetch next batch of emails efficiently
-- UPDATED: Adds Smart Retry Logic + Scheduled Time Logic

CREATE OR REPLACE FUNCTION fetch_next_queue_batch(
    p_limit INT,
    p_active_campaign_ids UUID[]
)
RETURNS TABLE (
    id UUID,
    campaign_id UUID,
    recipient_email TEXT,
    subject TEXT,
    body_html TEXT,
    attachments JSONB,
    attempts INT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH next_batch AS (
        SELECT eq.id
        FROM email_queue eq
        WHERE eq.campaign_id = ANY(p_active_campaign_ids)
        AND (
            -- Condition 1: Normal Pending (Scheduled time passed or null)
            (
                eq.status = 'pending' 
                AND (eq.scheduled_at IS NULL OR eq.scheduled_at <= NOW())
            )
            OR 
            -- Condition 2: Retry Failed (Failed > 5m ago and < 3 attempts)
            (
                eq.status = 'failed' 
                AND eq.attempts < 3 
                AND eq.updated_at < (NOW() - INTERVAL '5 minutes')
            )
        )
        ORDER BY eq.updated_at ASC -- Oldest first
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    UPDATE email_queue eq
    SET status = 'processing', updated_at = NOW()
    FROM next_batch nb
    WHERE eq.id = nb.id
    RETURNING 
        eq.id, 
        eq.campaign_id, 
        eq.recipient_email, 
        eq.subject, 
        eq.body_html, 
        eq.attachments, 
        eq.attempts;
END;
$$;
