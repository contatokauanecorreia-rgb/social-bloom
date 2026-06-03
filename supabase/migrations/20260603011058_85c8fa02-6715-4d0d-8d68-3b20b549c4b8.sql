
CREATE TABLE public.studio_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NULL,
  kind text NOT NULL CHECK (kind IN ('carrossel','video')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','error','canceled')),
  progress int NOT NULL DEFAULT 0,
  title text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL
);

CREATE INDEX studio_jobs_user_status_idx ON public.studio_jobs (user_id, status, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_jobs TO authenticated;
GRANT ALL ON public.studio_jobs TO service_role;

ALTER TABLE public.studio_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own studio jobs"
  ON public.studio_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own studio jobs"
  ON public.studio_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own studio jobs"
  ON public.studio_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own studio jobs"
  ON public.studio_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER studio_jobs_set_updated_at
  BEFORE UPDATE ON public.studio_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.studio_jobs;
