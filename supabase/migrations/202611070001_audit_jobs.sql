BEGIN;

ALTER TABLE public.videos
    ADD COLUMN IF NOT EXISTS owner_id uuid,
    ADD COLUMN IF NOT EXISTS run_id uuid,
    ADD COLUMN IF NOT EXISTS progress jsonb,
    ADD COLUMN IF NOT EXISTS processing_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.violations
    ADD COLUMN IF NOT EXISTS description text;

-- The backend is the only Data API caller for these tables.
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.videos, public.violations, public.frames
    FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.finish_audit(
    p_video_id uuid,
    p_run_id uuid,
    p_risk_score double precision,
    p_report text,
    p_findings jsonb
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.videos
       SET status = 'completed',
           risk_score = p_risk_score,
           report = p_report,
           progress = NULL,
           processing_updated_at = now()
     WHERE id = p_video_id AND run_id = p_run_id AND status = 'processing';

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    DELETE FROM public.violations WHERE video_id = p_video_id;
    INSERT INTO public.violations
        (video_id, timestamp, violation_type, confidence, frame_url, description)
    SELECT p_video_id, finding.timestamp, finding.violation_type, finding.confidence,
           finding.frame_url, finding.description
      FROM jsonb_to_recordset(p_findings) AS finding(
          timestamp double precision, violation_type text, confidence double precision,
          frame_url text, description text
      );

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.finish_audit(uuid, uuid, double precision, text, jsonb)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_audit(uuid, uuid, double precision, text, jsonb)
    TO service_role;

COMMIT;
