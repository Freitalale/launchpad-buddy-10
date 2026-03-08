
ALTER TABLE public.plataformas
ADD COLUMN IF NOT EXISTS tabela_depositos text DEFAULT 'deposits',
ADD COLUMN IF NOT EXISTS tabela_saques text DEFAULT 'withdrawals',
ADD COLUMN IF NOT EXISTS coluna_id_usuario text DEFAULT 'id',
ADD COLUMN IF NOT EXISTS coluna_nome_usuario text DEFAULT 'name',
ADD COLUMN IF NOT EXISTS coluna_valor_deposito text DEFAULT 'amount',
ADD COLUMN IF NOT EXISTS coluna_valor_saque text DEFAULT 'amount',
ADD COLUMN IF NOT EXISTS coluna_pix text DEFAULT 'pix',
ADD COLUMN IF NOT EXISTS coluna_status text DEFAULT 'status',
ADD COLUMN IF NOT EXISTS coluna_created_at text DEFAULT 'created_at',
ADD COLUMN IF NOT EXISTS coluna_user_id_fk text DEFAULT 'user_id';
