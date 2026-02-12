
-- Chat users (anonymous, device-based)
CREATE TABLE public.chat_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  nickname text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chat users"
  ON public.chat_users FOR SELECT USING (true);

CREATE POLICY "Anyone can insert chat users"
  ON public.chat_users FOR INSERT WITH CHECK (true);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.chat_users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages"
  ON public.chat_messages FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages"
  ON public.chat_messages FOR INSERT WITH CHECK (true);

-- Chat polls (admin only creates via edge function)
CREATE TABLE public.chat_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read polls"
  ON public.chat_polls FOR SELECT USING (true);

-- Poll options
CREATE TABLE public.chat_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  label text NOT NULL
);

ALTER TABLE public.chat_poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poll options"
  ON public.chat_poll_options FOR SELECT USING (true);

-- Poll votes
CREATE TABLE public.chat_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.chat_poll_options(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, device_id)
);

ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poll votes"
  ON public.chat_poll_votes FOR SELECT USING (true);

CREATE POLICY "Anyone can insert poll votes"
  ON public.chat_poll_votes FOR INSERT WITH CHECK (true);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
