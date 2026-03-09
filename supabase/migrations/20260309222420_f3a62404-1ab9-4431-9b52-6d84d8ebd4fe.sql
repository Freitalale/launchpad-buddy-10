ALTER TABLE public.telegram_config ADD COLUMN IF NOT EXISTS pushcut_url text DEFAULT NULL;
ALTER TABLE public.telegram_config ADD COLUMN IF NOT EXISTS pushcut_ativo boolean DEFAULT false;
ALTER TABLE public.telegram_eventos ADD COLUMN IF NOT EXISTS mensagem_pushcut text DEFAULT NULL;