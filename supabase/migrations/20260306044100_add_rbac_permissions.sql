-- Add permissions column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "pages": { "inbox": true, "compose": true, "queue": true, "history": true, "hotels": true },
  "actions": {
    "inbox_delete": false,
    "compose_attach": false,
    "compose_html": false,
    "queue_delete": false,
    "queue_send": false,
    "history_delete": false,
    "hotels_add": false,
    "hotels_edit": false,
    "hotels_delete": false
  }
}'::jsonb;
