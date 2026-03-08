ALTER TABLE public.plataformas ADD COLUMN IF NOT EXISTS api_key text DEFAULT gen_random_uuid()::text;

-- Update existing rows that have null api_key
UPDATE public.plataformas SET api_key = gen_random_uuid()::text WHERE api_key IS NULL;