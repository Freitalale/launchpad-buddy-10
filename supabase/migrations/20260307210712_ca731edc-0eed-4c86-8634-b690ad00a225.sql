-- Create enums
CREATE TYPE public.platform_category AS ENUM ('chinese', 'brazilian', 'esports', 'casino', 'sports', 'other');
CREATE TYPE public.platform_status AS ENUM ('online', 'offline', 'error', 'warning');

-- Create plataformas table
CREATE TABLE public.plataformas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT,
  categoria platform_category NOT NULL DEFAULT 'other',
  status platform_status NOT NULL DEFAULT 'offline',
  logo TEXT DEFAULT '🎮',
  cor TEXT DEFAULT '#00c4ff',
  total_usuarios INTEGER DEFAULT 0,
  total_afiliados INTEGER DEFAULT 0,
  saldo_total NUMERIC DEFAULT 0,
  db_host TEXT,
  db_user TEXT,
  db_pass TEXT,
  db_name TEXT,
  db_port INTEGER DEFAULT 3306,
  tabela_usuarios TEXT DEFAULT 'users',
  tabela_afiliados TEXT DEFAULT 'affiliates',
  tabela_saldo TEXT DEFAULT 'wallets',
  coluna_saldo TEXT DEFAULT 'balance',
  webhook_telegram TEXT,
  webhook_outro TEXT,
  gateway_chave TEXT,
  cooperacao_dias INTEGER,
  cooperacao_expira TEXT,
  ultimo_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plataformas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own platforms" ON public.plataformas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own platforms" ON public.plataformas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own platforms" ON public.plataformas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own platforms" ON public.plataformas FOR DELETE USING (auth.uid() = user_id);

-- Create logs table
CREATE TABLE public.logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  detalhes TEXT,
  plataforma_id UUID,
  plataforma_nome TEXT,
  usuario TEXT,
  valor NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own logs" ON public.logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.logs FOR DELETE USING (auth.uid() = user_id);

-- Create notificacoes table
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  tipo TEXT NOT NULL DEFAULT 'info',
  lida BOOLEAN NOT NULL DEFAULT false,
  plataforma_id TEXT,
  plataforma_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notificacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notifications" ON public.notificacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notificacoes FOR UPDATE USING (auth.uid() = user_id);

-- Create configuracoes table
CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_telegram_global TEXT,
  webhook_outro_global TEXT,
  gateway_chave_global TEXT,
  cooperacao_dias_padrao INTEGER DEFAULT 30,
  exclusao_automatica_afiliados BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON public.configuracoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own settings" ON public.configuracoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.configuracoes FOR UPDATE USING (auth.uid() = user_id);

-- Create telegram_config table
CREATE TABLE public.telegram_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_token TEXT,
  chat_id TEXT,
  ativo BOOLEAN NOT NULL DEFAULT false,
  notif_novo_usuario BOOLEAN DEFAULT true,
  notif_deposito BOOLEAN DEFAULT true,
  notif_saque BOOLEAN DEFAULT true,
  notif_plataforma_offline BOOLEAN DEFAULT true,
  notif_erro BOOLEAN DEFAULT true,
  notif_cooperacao BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own telegram config" ON public.telegram_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own telegram config" ON public.telegram_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own telegram config" ON public.telegram_config FOR UPDATE USING (auth.uid() = user_id);

-- Create mensagens_personalizadas table
CREATE TABLE public.mensagens_personalizadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mensagens_personalizadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.mensagens_personalizadas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own messages" ON public.mensagens_personalizadas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.mensagens_personalizadas FOR UPDATE USING (auth.uid() = user_id);

-- Create telegram_eventos table
CREATE TABLE public.telegram_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own telegram events" ON public.telegram_eventos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own telegram events" ON public.telegram_eventos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own telegram events" ON public.telegram_eventos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own telegram events" ON public.telegram_eventos FOR DELETE USING (auth.uid() = user_id);

-- Create logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
CREATE POLICY "Logo images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Users can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Users can update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');

-- Auto-create settings for new users
CREATE OR REPLACE FUNCTION public.create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.configuracoes (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_settings();

-- Enable realtime for notificacoes
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;