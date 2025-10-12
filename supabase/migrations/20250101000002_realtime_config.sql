-- Enable Realtime for tables that need live updates

-- Enable realtime on device_status for live status monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE device_status;

-- Enable realtime on jobs for live job updates
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- Enable realtime on error_logs for live error monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE error_logs;

-- Enable realtime on reported_issues for live issue tracking
ALTER PUBLICATION supabase_realtime ADD TABLE reported_issues;

-- Optional: Enable realtime on analytics for live analytics dashboard
-- ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;

-- Note: Make sure Realtime is enabled in your Supabase project settings
-- Go to: Database > Replication > supabase_realtime publication
