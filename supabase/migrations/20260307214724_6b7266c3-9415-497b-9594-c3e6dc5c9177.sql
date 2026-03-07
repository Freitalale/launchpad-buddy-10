
-- Table: depositos
CREATE TABLE public.depositos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plataforma_id uuid REFERENCES public.plataformas(id) ON DELETE CASCADE,
  plataforma_nome text,
  nome_usuario text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  pix text,
  status text NOT NULL DEFAULT 'pendente',
  detalhes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own depositos" ON public.depositos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own depositos" ON public.depositos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own depositos" ON public.depositos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own depositos" ON public.depositos FOR DELETE USING (auth.uid() = user_id);

-- Table: saques
CREATE TABLE public.saques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plataforma_id uuid REFERENCES public.plataformas(id) ON DELETE CASCADE,
  plataforma_nome text,
  nome_usuario text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  pix text,
  status text NOT NULL DEFAULT 'pendente',
  detalhes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own saques" ON public.saques FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own saques" ON public.saques FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saques" ON public.saques FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saques" ON public.saques FOR DELETE USING (auth.uid() = user_id);

-- Table: sacs
CREATE TABLE public.sacs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plataforma_id uuid REFERENCES public.plataformas(id) ON DELETE CASCADE,
  plataforma_nome text,
  nome_usuario text NOT NULL,
  valor numeric DEFAULT 0,
  pix text,
  motivo text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sacs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sacs" ON public.sacs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sacs" ON public.sacs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sacs" ON public.sacs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sacs" ON public.sacs FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.depositos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saques;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sacs;
