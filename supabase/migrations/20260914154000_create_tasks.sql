-- F-01: tasks table with per-user RLS and focus-limit trigger

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  focus_date date,
  completed_at timestamptz
);

CREATE INDEX tasks_user_id_idx ON public.tasks (user_id);

CREATE INDEX tasks_user_id_focus_date_idx
  ON public.tasks (user_id, focus_date)
  WHERE focus_date IS NOT NULL;

CREATE INDEX tasks_user_id_created_at_idx
  ON public.tasks (user_id, created_at DESC);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select_own ON public.tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY tasks_insert_own ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY tasks_update_own ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY tasks_delete_own ON public.tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_focus_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  slot_count integer;
BEGIN
  IF NEW.focus_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.focus_date IS NOT DISTINCT FROM NEW.focus_date THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text || NEW.focus_date::text));

  SELECT COUNT(*)
  INTO slot_count
  FROM public.tasks
  WHERE user_id = NEW.user_id
    AND focus_date = NEW.focus_date
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

  IF slot_count >= 3 THEN
    RAISE EXCEPTION 'focus_limit_exceeded'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_enforce_focus_limit
  BEFORE INSERT OR UPDATE OF focus_date ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_focus_limit();
