
ALTER TABLE public.plataformas
  ADD COLUMN IF NOT EXISTS mapeamento_extra jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.plataformas.mapeamento_extra IS 'Custom extra columns/tables mapping per platform. Structure: { "tabelas_extra": [...], "colunas_extra": { "table_name": [{label, column},...] } }';
