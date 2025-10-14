-- ============================================
-- REAL-TIME MONITORING RPC FUNCTIONS
-- ============================================
-- These functions enable the web panel to monitor database performance,
-- active queries, connection pools, and cache efficiency in real-time.

-- ============================================
-- 1. GET ACTIVE QUERIES
-- ============================================
-- Shows currently running queries with their duration and state
-- Useful for identifying long-running or stuck queries

CREATE OR REPLACE FUNCTION get_active_queries()
RETURNS TABLE (
  pid INTEGER,
  username TEXT,
  database TEXT,
  client_address TEXT,
  application_name TEXT,
  state TEXT,
  query TEXT,
  duration_seconds NUMERIC,
  duration_formatted TEXT,
  query_start TIMESTAMPTZ,
  state_change TIMESTAMPTZ
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg_stat_activity.pid::INTEGER,
    pg_stat_activity.usename::TEXT AS username,
    pg_stat_activity.datname::TEXT AS database,
    pg_stat_activity.client_addr::TEXT AS client_address,
    pg_stat_activity.application_name::TEXT,
    pg_stat_activity.state::TEXT,
    pg_stat_activity.query::TEXT,
    EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start))::NUMERIC AS duration_seconds,
    CASE
      WHEN EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start)) < 60 THEN
        ROUND(EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start))::NUMERIC, 2)::TEXT || 's'
      WHEN EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start)) < 3600 THEN
        FLOOR(EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start)) / 60)::TEXT || 'm ' ||
        ROUND((EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start)) % 60)::NUMERIC, 0)::TEXT || 's'
      ELSE
        FLOOR(EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start)) / 3600)::TEXT || 'h ' ||
        FLOOR((EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start)) % 3600) / 60)::TEXT || 'm'
    END AS duration_formatted,
    pg_stat_activity.query_start,
    pg_stat_activity.state_change
  FROM pg_stat_activity
  WHERE pg_stat_activity.state != 'idle'
    AND pg_stat_activity.pid != pg_backend_pid()
    AND pg_stat_activity.query NOT LIKE '%pg_stat_activity%'
  ORDER BY duration_seconds DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_active_queries() TO authenticated;

-- ============================================
-- 2. GET CONNECTION POOL STATS
-- ============================================
-- Provides overview of database connection usage
-- Helps identify connection pool exhaustion issues

CREATE OR REPLACE FUNCTION get_connection_pool_stats()
RETURNS TABLE (
  total_connections BIGINT,
  active_connections BIGINT,
  idle_connections BIGINT,
  idle_in_transaction BIGINT,
  waiting_connections BIGINT,
  max_connections INTEGER,
  usage_percentage NUMERIC,
  available_connections INTEGER
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_connections,
    COUNT(*) FILTER (WHERE state = 'active')::BIGINT AS active_connections,
    COUNT(*) FILTER (WHERE state = 'idle')::BIGINT AS idle_connections,
    COUNT(*) FILTER (WHERE state = 'idle in transaction')::BIGINT AS idle_in_transaction,
    COUNT(*) FILTER (WHERE wait_event IS NOT NULL)::BIGINT AS waiting_connections,
    current_setting('max_connections')::INTEGER AS max_connections,
    ROUND((COUNT(*)::NUMERIC / current_setting('max_connections')::NUMERIC) * 100, 2) AS usage_percentage,
    (current_setting('max_connections')::INTEGER - COUNT(*)::INTEGER) AS available_connections
  FROM pg_stat_activity;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_connection_pool_stats() TO authenticated;

-- ============================================
-- 3. GET SLOW QUERIES
-- ============================================
-- Identifies queries with high execution time
-- Note: Requires pg_stat_statements extension
-- If extension is not available, this will return empty results

CREATE OR REPLACE FUNCTION get_slow_queries(min_duration_ms NUMERIC DEFAULT 100)
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_exec_time_ms NUMERIC,
  mean_exec_time_ms NUMERIC,
  max_exec_time_ms NUMERIC,
  min_exec_time_ms NUMERIC,
  stddev_exec_time_ms NUMERIC,
  rows_returned BIGINT,
  last_executed TIMESTAMPTZ
)
SECURITY DEFINER
AS $$
BEGIN
  -- Check if pg_stat_statements extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) THEN
    RETURN QUERY
    SELECT
      pss.query::TEXT,
      pss.calls::BIGINT,
      ROUND(pss.total_exec_time::NUMERIC, 2) AS total_exec_time_ms,
      ROUND(pss.mean_exec_time::NUMERIC, 2) AS mean_exec_time_ms,
      ROUND(pss.max_exec_time::NUMERIC, 2) AS max_exec_time_ms,
      ROUND(pss.min_exec_time::NUMERIC, 2) AS min_exec_time_ms,
      ROUND(pss.stddev_exec_time::NUMERIC, 2) AS stddev_exec_time_ms,
      pss.rows::BIGINT AS rows_returned,
      NULL::TIMESTAMPTZ AS last_executed
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > min_duration_ms
      AND pss.query NOT LIKE '%pg_stat_statements%'
    ORDER BY pss.mean_exec_time DESC
    LIMIT 50;
  ELSE
    -- Return empty result with informative message
    RETURN QUERY
    SELECT
      'pg_stat_statements extension not enabled. Enable with: CREATE EXTENSION pg_stat_statements;'::TEXT AS query,
      0::BIGINT AS calls,
      0::NUMERIC AS total_exec_time_ms,
      0::NUMERIC AS mean_exec_time_ms,
      0::NUMERIC AS max_exec_time_ms,
      0::NUMERIC AS min_exec_time_ms,
      0::NUMERIC AS stddev_exec_time_ms,
      0::BIGINT AS rows_returned,
      NULL::TIMESTAMPTZ AS last_executed
    LIMIT 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_slow_queries(NUMERIC) TO authenticated;

-- ============================================
-- 4. GET CACHE HIT RATIO
-- ============================================
-- Measures how often data is found in cache vs read from disk
-- A ratio above 95% is considered healthy

CREATE OR REPLACE FUNCTION get_cache_hit_ratio()
RETURNS TABLE (
  cache_hit_ratio NUMERIC,
  cache_hit_ratio_formatted TEXT,
  blocks_hit BIGINT,
  blocks_read BIGINT,
  total_blocks BIGINT,
  status TEXT,
  recommendation TEXT
)
SECURITY DEFINER
AS $$
DECLARE
  v_cache_ratio NUMERIC;
BEGIN
  RETURN QUERY
  WITH cache_stats AS (
    SELECT
      blks_hit,
      blks_read,
      blks_hit + blks_read AS total
    FROM pg_stat_database
    WHERE datname = current_database()
  )
  SELECT
    CASE
      WHEN total = 0 THEN 0
      ELSE ROUND((blks_hit::NUMERIC / total::NUMERIC) * 100, 2)
    END AS cache_hit_ratio,
    CASE
      WHEN total = 0 THEN '0.00%'
      ELSE ROUND((blks_hit::NUMERIC / total::NUMERIC) * 100, 2)::TEXT || '%'
    END AS cache_hit_ratio_formatted,
    blks_hit::BIGINT AS blocks_hit,
    blks_read::BIGINT AS blocks_read,
    total::BIGINT AS total_blocks,
    CASE
      WHEN total = 0 THEN 'No Data'
      WHEN (blks_hit::NUMERIC / total::NUMERIC) * 100 >= 99 THEN 'Excellent'
      WHEN (blks_hit::NUMERIC / total::NUMERIC) * 100 >= 95 THEN 'Good'
      WHEN (blks_hit::NUMERIC / total::NUMERIC) * 100 >= 90 THEN 'Fair'
      ELSE 'Poor'
    END AS status,
    CASE
      WHEN total = 0 THEN 'No queries executed yet'
      WHEN (blks_hit::NUMERIC / total::NUMERIC) * 100 >= 99 THEN 'Cache performance is excellent'
      WHEN (blks_hit::NUMERIC / total::NUMERIC) * 100 >= 95 THEN 'Cache performance is good'
      WHEN (blks_hit::NUMERIC / total::NUMERIC) * 100 >= 90 THEN 'Consider increasing shared_buffers'
      ELSE 'Poor cache performance. Increase shared_buffers and effective_cache_size'
    END AS recommendation
  FROM cache_stats;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_cache_hit_ratio() TO authenticated;

-- ============================================
-- 5. GET DATABASE SIZE STATS
-- ============================================
-- Provides detailed database size information

CREATE OR REPLACE FUNCTION get_database_size_stats()
RETURNS TABLE (
  database_name TEXT,
  size_bytes BIGINT,
  size_formatted TEXT,
  table_count BIGINT,
  index_count BIGINT,
  total_rows BIGINT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    current_database()::TEXT AS database_name,
    pg_database_size(current_database())::BIGINT AS size_bytes,
    pg_size_pretty(pg_database_size(current_database()))::TEXT AS size_formatted,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')::BIGINT AS table_count,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public')::BIGINT AS index_count,
    (SELECT SUM(n_live_tup) FROM pg_stat_user_tables)::BIGINT AS total_rows;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size_stats() TO authenticated;

-- ============================================
-- 6. GET TABLE BLOAT STATS
-- ============================================
-- Identifies tables with high bloat that may need VACUUM

CREATE OR REPLACE FUNCTION get_table_bloat_stats()
RETURNS TABLE (
  table_name TEXT,
  total_bytes BIGINT,
  total_size TEXT,
  dead_tuples BIGINT,
  live_tuples BIGINT,
  dead_tuple_percentage NUMERIC,
  last_vacuum TIMESTAMPTZ,
  last_autovacuum TIMESTAMPTZ,
  needs_vacuum BOOLEAN
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || relname AS table_name,
    pg_total_relation_size(schemaname || '.' || relname)::BIGINT AS total_bytes,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname))::TEXT AS total_size,
    n_dead_tup::BIGINT AS dead_tuples,
    n_live_tup::BIGINT AS live_tuples,
    CASE
      WHEN n_live_tup = 0 THEN 0
      ELSE ROUND((n_dead_tup::NUMERIC / (n_live_tup + n_dead_tup)::NUMERIC) * 100, 2)
    END AS dead_tuple_percentage,
    last_vacuum,
    last_autovacuum,
    (n_dead_tup > 1000 AND (n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0)::NUMERIC) > 0.1) AS needs_vacuum
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY n_dead_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_table_bloat_stats() TO authenticated;

-- ============================================
-- 7. GET INDEX USAGE STATS
-- ============================================
-- Shows which indexes are being used and which are not

CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
  schema_name TEXT,
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  index_scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT,
  is_unique BOOLEAN,
  is_unused BOOLEAN
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname::TEXT AS schema_name,
    tablename::TEXT AS table_name,
    indexrelname::TEXT AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid))::TEXT AS index_size,
    idx_scan::BIGINT AS index_scans,
    idx_tup_read::BIGINT AS tuples_read,
    idx_tup_fetch::BIGINT AS tuples_fetched,
    indisunique AS is_unique,
    (idx_scan = 0) AS is_unused
  FROM pg_stat_user_indexes
  JOIN pg_index USING (indexrelid)
  WHERE schemaname = 'public'
  ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_active_queries() IS 'Returns all currently running queries with execution time and details';
COMMENT ON FUNCTION get_connection_pool_stats() IS 'Returns connection pool usage statistics and availability';
COMMENT ON FUNCTION get_slow_queries(NUMERIC) IS 'Returns queries with average execution time above threshold (requires pg_stat_statements)';
COMMENT ON FUNCTION get_cache_hit_ratio() IS 'Returns cache hit ratio and performance recommendations';
COMMENT ON FUNCTION get_database_size_stats() IS 'Returns database size and table/index counts';
COMMENT ON FUNCTION get_table_bloat_stats() IS 'Returns table bloat statistics and vacuum recommendations';
COMMENT ON FUNCTION get_index_usage_stats() IS 'Returns index usage statistics to identify unused indexes';
