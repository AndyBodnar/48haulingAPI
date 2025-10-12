-- API Management Tables for Dynamic Endpoint Creation
-- Run this after STEP4_make_admin.sql

-- 1. Create api_endpoints table to store endpoint configurations
CREATE TABLE IF NOT EXISTS public.api_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'get-user-profile'
    display_name TEXT NOT NULL, -- e.g., 'Get User Profile'
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    path TEXT NOT NULL, -- e.g., '/get-user-profile'
    description TEXT,
    auth_required BOOLEAN DEFAULT true,
    role_required TEXT CHECK (role_required IN ('admin', 'driver', 'user', NULL)),
    rate_limit INTEGER DEFAULT 60, -- requests per minute
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create api_metrics table to track endpoint usage
CREATE TABLE IF NOT EXISTS public.api_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID REFERENCES public.api_endpoints(id) ON DELETE CASCADE,
    endpoint_name TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    user_id UUID REFERENCES auth.users(id),
    user_agent TEXT,
    ip_address TEXT,
    error_message TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 3. Create endpoint_parameters table for dynamic endpoint configs
CREATE TABLE IF NOT EXISTS public.endpoint_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID REFERENCES public.api_endpoints(id) ON DELETE CASCADE,
    param_name TEXT NOT NULL,
    param_type TEXT NOT NULL CHECK (param_type IN ('string', 'number', 'boolean', 'array', 'object')),
    is_required BOOLEAN DEFAULT false,
    description TEXT,
    default_value TEXT,
    validation_rule TEXT, -- JSON schema or regex pattern
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create middleware_config table
CREATE TABLE IF NOT EXISTS public.middleware_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID REFERENCES public.api_endpoints(id) ON DELETE CASCADE,
    middleware_name TEXT NOT NULL,
    execution_order INTEGER NOT NULL DEFAULT 0,
    config JSONB DEFAULT '{}'::jsonb,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint_id ON public.api_metrics(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_api_metrics_timestamp ON public.api_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint_name ON public.api_metrics(endpoint_name);
CREATE INDEX IF NOT EXISTS idx_api_metrics_status_code ON public.api_metrics(status_code);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_name ON public.api_endpoints(name);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_is_active ON public.api_endpoints(is_active);
CREATE INDEX IF NOT EXISTS idx_endpoint_parameters_endpoint_id ON public.endpoint_parameters(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_middleware_config_endpoint_id ON public.middleware_config(endpoint_id);

-- 6. Enable Row Level Security
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endpoint_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.middleware_config ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for api_endpoints
CREATE POLICY "Admins can manage endpoints"
    ON public.api_endpoints
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Everyone can view active endpoints"
    ON public.api_endpoints
    FOR SELECT
    USING (is_active = true);

-- 8. RLS Policies for api_metrics
CREATE POLICY "Admins can view all metrics"
    ON public.api_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert metrics"
    ON public.api_metrics
    FOR INSERT
    WITH CHECK (true); -- Allow service role to insert metrics

-- 9. RLS Policies for endpoint_parameters
CREATE POLICY "Admins can manage endpoint parameters"
    ON public.endpoint_parameters
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Everyone can view active endpoint parameters"
    ON public.endpoint_parameters
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.api_endpoints
            WHERE api_endpoints.id = endpoint_parameters.endpoint_id
            AND api_endpoints.is_active = true
        )
    );

-- 10. RLS Policies for middleware_config
CREATE POLICY "Admins can manage middleware"
    ON public.middleware_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 11. Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for api_endpoints
CREATE TRIGGER update_api_endpoints_updated_at
    BEFORE UPDATE ON public.api_endpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 13. Insert default endpoints from existing functions
INSERT INTO public.api_endpoints (name, display_name, method, path, description, auth_required, role_required, rate_limit) VALUES
    ('heartbeat', 'Heartbeat', 'POST', '/heartbeat', 'Keep-alive ping from mobile/web app', true, NULL, 100),
    ('log-error', 'Log Error', 'POST', '/log-error', 'Automatic crash/error reporting', true, NULL, 60),
    ('report-issue', 'Report Issue', 'POST', '/report-issue', 'User-submitted bug reports', true, NULL, 30),
    ('check-app-version', 'Check App Version', 'POST', '/check-app-version', 'Check for app updates', false, NULL, 100),
    ('get-optimized-route', 'Get Optimized Route', 'POST', '/get-optimized-route', 'Get navigation route (Google Maps)', true, 'driver', 60),
    ('update-job-status', 'Update Job Status', 'POST', '/update-job-status', 'Update job progress', true, 'driver', 60),
    ('track-analytics', 'Track Analytics', 'POST', '/track-analytics', 'Track user behavior/events', true, NULL, 100),
    ('get-dashboard-stats', 'Get Dashboard Stats', 'GET', '/get-dashboard-stats', 'Dashboard statistics', true, 'admin', 60),
    ('get-users', 'Get Users', 'GET', '/get-users', 'List all users', true, 'admin', 60),
    ('update-user-role', 'Update User Role', 'POST', '/update-user-role', 'Change user role', true, 'admin', 30),
    ('create-job', 'Create Job', 'POST', '/create-job', 'Create new delivery job', true, 'admin', 60),
    ('assign-job', 'Assign Job', 'POST', '/assign-job', 'Assign job to driver', true, 'admin', 60),
    ('submit-payroll', 'Submit Payroll', 'POST', '/submit-payroll', 'Process payroll (QuickBooks)', true, 'admin', 10)
ON CONFLICT (name) DO NOTHING;

-- 14. Enable realtime for api_metrics (for live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_metrics;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'API Management schema created successfully!';
    RAISE NOTICE 'Tables created: api_endpoints, api_metrics, endpoint_parameters, middleware_config';
    RAISE NOTICE 'You can now manage endpoints dynamically through the admin panel.';
END $$;
