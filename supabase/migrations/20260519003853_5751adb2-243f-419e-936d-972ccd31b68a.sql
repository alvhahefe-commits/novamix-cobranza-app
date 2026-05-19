
-- 1. Make receipts bucket private so files require signed URLs
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- 2. Restrict Realtime channel subscriptions per user
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_realtime_topic_select" ON realtime.messages;
CREATE POLICY "users_own_realtime_topic_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() = 'novamix-' || (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "users_own_realtime_topic_insert" ON realtime.messages;
CREATE POLICY "users_own_realtime_topic_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (realtime.topic() = 'novamix-' || (SELECT auth.uid())::text);
