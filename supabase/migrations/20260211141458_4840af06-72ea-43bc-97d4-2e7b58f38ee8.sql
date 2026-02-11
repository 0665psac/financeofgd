
-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  button_label TEXT,
  button_link TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Public read access for published announcements
CREATE POLICY "Anyone can view published announcements"
ON public.announcements
FOR SELECT
USING (is_published = true);

-- Create admin_settings table for storing admin password hash
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- No public access to admin_settings (only edge functions with service role)

-- Create storage bucket for announcement banners
INSERT INTO storage.buckets (id, name, public) VALUES ('announcement-banners', 'announcement-banners', true);

CREATE POLICY "Anyone can view announcement banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-banners');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin password (hashed via pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.admin_settings (key, value)
VALUES ('admin_password', crypt('DATSU68', gen_salt('bf')));
