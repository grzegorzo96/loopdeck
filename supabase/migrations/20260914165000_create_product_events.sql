CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'account_created',
      'first_task_added',
      'focus_day_set',
      'task_completed'
    )
  ),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX product_events_user_id_event_type_idx ON public.product_events (user_id, event_type);
CREATE INDEX product_events_user_id_occurred_at_idx ON public.product_events (user_id, occurred_at DESC);

CREATE UNIQUE INDEX product_events_first_task_once
  ON public.product_events (user_id)
  WHERE event_type = 'first_task_added';

CREATE UNIQUE INDEX product_events_focus_day_once
  ON public.product_events (user_id, (metadata ->> 'focus_date'))
  WHERE event_type = 'focus_day_set';

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_events_select_own ON public.product_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY product_events_insert_own ON public.product_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
