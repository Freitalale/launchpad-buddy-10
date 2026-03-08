-- Step 1: Remove duplicates keeping one per unique combination (uuid needs cast)
DELETE FROM depositos
WHERE id NOT IN (
  SELECT min_id FROM (
    SELECT MIN(id::text)::uuid as min_id
    FROM depositos
    GROUP BY user_id, plataforma_id, nome_usuario, valor, created_at
  ) as keep_ids
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE depositos ADD CONSTRAINT depositos_unique_record 
  UNIQUE (user_id, plataforma_id, nome_usuario, valor, created_at);

-- Step 3: Same for saques
ALTER TABLE saques ADD CONSTRAINT saques_unique_record 
  UNIQUE (user_id, plataforma_id, nome_usuario, valor, created_at);