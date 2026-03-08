

## Plano: API Controlada Dinamicamente pelo Painel

### Problema
Hoje o `api.php` usa nomes de tabelas/colunas definidos no `config.php` estático. Para mudar o mapeamento, o administrador precisa editar o arquivo PHP na hospedagem manualmente.

### Solução
Criar um sistema onde o `api.php` busca o mapeamento diretamente do painel (via endpoint público) ao receber cada request. Assim, qualquer mudança feita no painel reflete instantaneamente na API sem editar código.

### Arquitetura

```text
Administrador muda mapeamento no Painel
        ↓
Salva na tabela "plataformas" (Lovable Cloud)
        ↓
Edge Function "get-platform-mapping" serve o mapeamento como JSON
        ↓
api.php (na hospedagem) faz fetch para buscar mapeamento
        ↓
Monta queries SQL dinamicamente com os nomes recebidos
```

### Implementação

**1. Nova Edge Function: `get-platform-mapping`**
- Endpoint público (sem JWT) que recebe um `platform_id` ou `api_key`
- Retorna o mapeamento completo (tabelas + colunas) da plataforma salvo na tabela `plataformas`
- A API PHP chama esse endpoint uma vez por request (com cache local de 60s no PHP)

**2. Novo `api.php` na documentação (Tutorial.tsx)**
- Remove dependência do config.php para nomes de tabelas/colunas
- O config.php mantém apenas credenciais do banco MySQL (host, user, pass, db)
- Na inicialização, faz `file_get_contents()` para o endpoint do painel buscando o mapeamento
- Cache local em arquivo (`/tmp/mapping_cache.json`) com TTL de 60s para não sobrecarregar
- Se o painel estiver offline, usa o último cache salvo
- Mensagem clara: "Dados usando cache — painel temporariamente offline"

**3. Campo `api_key` na tabela `plataformas`**
- Migração para adicionar coluna `api_key` (UUID gerado automaticamente)
- Usado como token de autenticação entre api.php e o endpoint de mapeamento
- Exibido na aba API do ConfigureModal com botão "Copiar Chave"

**4. Atualização do ConfigureModal**
- Aba API: mostrar a `api_key` gerada + URL do endpoint de mapeamento
- Botão "Gerar config.php" que cria o arquivo com credenciais do banco + URL do endpoint do painel
- Botão "Gerar api.php" que gera o código PHP completo pronto para copiar
- Preview em tempo real das queries SQL que serão geradas baseado no mapeamento atual

**5. Atualização completa do Tutorial.tsx**
- Novo `config.php`: só credenciais + `$painel_url` + `$api_key`
- Novo `api.php`: busca mapeamento do painel dinamicamente, com cache e fallback
- Novo fluxo explicado: "mude no painel → API muda sozinha"
- Checklist atualizado com verificação do endpoint de mapeamento
- Seção explicando o cache e comportamento offline

**6. Botões de diagnóstico aprimorados**
- "Testar Estrutura do Banco": agora envia o mapeamento atual para o `check-platform-db` e valida
- "Testar Endpoint de Mapeamento": verifica se o api.php consegue buscar o mapeamento do painel

### Detalhes Técnicos

- **Edge Function `get-platform-mapping`**: lê da tabela `plataformas` por `api_key`, retorna JSON com tables + columns mapping. Sem JWT (a api.php na hospedagem não tem token de usuário), autenticado via `api_key` única por plataforma.
- **Migração SQL**: `ALTER TABLE plataformas ADD COLUMN api_key text DEFAULT gen_random_uuid()::text`
- **RLS**: nova policy permitindo leitura via service role key na edge function (SECURITY DEFINER pattern)
- **config.toml**: adicionar `[functions.get-platform-mapping] verify_jwt = false`

### Arquivos a criar/editar
1. `supabase/functions/get-platform-mapping/index.ts` — novo
2. `supabase/config.toml` — adicionar config da nova function (note: não editamos diretamente, mas precisamos da configuração)
3. Migração SQL — adicionar `api_key` à tabela `plataformas`
4. `src/components/ConfigureModal.tsx` — botões gerar config/api, mostrar api_key
5. `src/pages/Tutorial.tsx` — documentação completa atualizada com novo fluxo
6. `supabase/functions/check-platform-db/index.ts` — atualizar para usar novo fluxo

