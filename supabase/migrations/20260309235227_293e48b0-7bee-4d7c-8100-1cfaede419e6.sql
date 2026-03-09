
CREATE TABLE public.notificacao_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  canal text NOT NULL DEFAULT 'telegram',
  evento text NOT NULL,
  mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  erro text,
  plataforma_id uuid,
  plataforma_nome text,
  destinatario text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacao_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notificacao_logs" ON public.notificacao_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notificacao_logs" ON public.notificacao_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notificacao_logs" ON public.notificacao_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
