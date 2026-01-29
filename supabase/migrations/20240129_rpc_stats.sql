CREATE OR REPLACE FUNCTION get_campaign_stats()
RETURNS TABLE (
  campaign_id UUID,
  total BIGINT,
  pending BIGINT,
  processing BIGINT,
  completed BIGINT,
  failed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.campaign_id,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
  FROM email_queue q
  WHERE q.campaign_id IS NOT NULL
  GROUP BY q.campaign_id;
END;
$$ LANGUAGE plpgsql;
