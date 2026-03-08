
-- Add per-table column mapping fields to plataformas
ALTER TABLE public.plataformas
  ADD COLUMN IF NOT EXISTS coluna_email_usuario text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS coluna_telefone_usuario text DEFAULT 'phone',
  ADD COLUMN IF NOT EXISTS coluna_id_deposito text DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS coluna_user_id_deposito text DEFAULT 'user_id',
  ADD COLUMN IF NOT EXISTS coluna_pix_deposito text DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS coluna_status_deposito text DEFAULT 'status',
  ADD COLUMN IF NOT EXISTS coluna_created_at_deposito text DEFAULT 'created_at',
  ADD COLUMN IF NOT EXISTS coluna_id_saque text DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS coluna_user_id_saque text DEFAULT 'user_id',
  ADD COLUMN IF NOT EXISTS coluna_pix_saque text DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS coluna_status_saque text DEFAULT 'status',
  ADD COLUMN IF NOT EXISTS coluna_created_at_saque text DEFAULT 'created_at',
  ADD COLUMN IF NOT EXISTS coluna_user_id_saldo text DEFAULT 'user_id',
  ADD COLUMN IF NOT EXISTS coluna_id_afiliado text DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS coluna_nome_afiliado text DEFAULT 'name',
  ADD COLUMN IF NOT EXISTS coluna_user_id_afiliado text DEFAULT 'user_id',
  ADD COLUMN IF NOT EXISTS coluna_cooperation_expired text DEFAULT 'cooperation_expired';
