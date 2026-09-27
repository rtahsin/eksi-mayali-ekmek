-- ==============================================================================
-- 🍞 EKMEKLAB MIGRATION: 011_rate_limit_buckets.sql
-- Persistent Distributed Sliding Window Rate Limiter
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
    key TEXT PRIMARY KEY,
    timestamps BIGINT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Row Level Security
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on rate_limit_buckets" ON public.rate_limit_buckets;

CREATE POLICY "Service role full access on rate_limit_buckets"
ON public.rate_limit_buckets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Performance Index
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_updated_at 
ON public.rate_limit_buckets(updated_at);

-- 3. Atomic Sliding Window Rate Limit Function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_max_requests INT DEFAULT 5,
    p_window_ms BIGINT DEFAULT 600000,
    p_now BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now BIGINT;
    v_timestamps BIGINT[];
    v_active_timestamps BIGINT[] := '{}';
    v_ts BIGINT;
    v_oldest BIGINT;
    v_retry_after_sec INT := 0;
    v_count INT := 0;
BEGIN
    IF p_now IS NULL THEN
        v_now := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    ELSE
        v_now := p_now;
    END IF;

    -- Upsert key with empty timestamps if missing to allow row locking
    INSERT INTO public.rate_limit_buckets (key, timestamps, updated_at)
    VALUES (p_key, '{}', NOW())
    ON CONFLICT (key) DO NOTHING;

    -- Lock row for update
    SELECT timestamps INTO v_timestamps
    FROM public.rate_limit_buckets
    WHERE key = p_key
    FOR UPDATE;

    -- Filter active timestamps in window
    IF v_timestamps IS NOT NULL THEN
        FOREACH v_ts IN ARRAY v_timestamps
        LOOP
            IF (v_now - v_ts) < p_window_ms THEN
                v_active_timestamps := array_append(v_active_timestamps, v_ts);
            END IF;
        END LOOP;
    END IF;

    v_count := COALESCE(array_length(v_active_timestamps, 1), 0);

    -- Check if limit exceeded
    IF v_count >= p_max_requests THEN
        v_oldest := v_active_timestamps[1];
        v_retry_after_sec := GREATEST(1, CEIL((p_window_ms - (v_now - v_oldest)) / 1000.0)::INT);

        -- Update with purged timestamps
        UPDATE public.rate_limit_buckets
        SET timestamps = v_active_timestamps,
            updated_at = NOW()
        WHERE key = p_key;

        RETURN jsonb_build_object(
            'allowed', false,
            'remaining', 0,
            'retryAfterSeconds', v_retry_after_sec
        );
    END IF;

    -- Append current timestamp
    v_active_timestamps := array_append(v_active_timestamps, v_now);
    v_count := array_length(v_active_timestamps, 1);

    UPDATE public.rate_limit_buckets
    SET timestamps = v_active_timestamps,
        updated_at = NOW()
    WHERE key = p_key;

    RETURN jsonb_build_object(
        'allowed', true,
        'remaining', p_max_requests - v_count,
        'retryAfterSeconds', 0
    );
END;
$$;

-- Grant execution to service_role and postgres
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, BIGINT, BIGINT) TO postgres;
