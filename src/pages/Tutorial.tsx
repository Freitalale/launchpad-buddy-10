import { motion } from "framer-motion";
import { BookOpen, Database, Key, Zap, Server, Send, Shield, ArrowRight } from "lucide-react";

const sections = [
  {
    icon: Database, color: "neon-blue", title: "1. Estrutura do Banco de Dados",
    content: `O sistema utiliza as seguintes tabelas no banco de dados:

**plataformas** — Armazena todas as plataformas de apostas cadastradas.
- id (uuid, PK), user_id (uuid), nome (text), url (text), categoria (enum), status (enum)
- total_usuarios (int), total_afiliados (int), saldo_total (numeric)
- cooperacao_dias (int), cooperacao_expira (text)
- db_host, db_user, db_pass, db_name, db_port — conexão ao banco externo
- tabela_usuarios, tabela_afiliados, tabela_saldo, coluna_saldo — mapeamento de tabelas
- webhook_telegram, webhook_outro, gateway_chave

**depositos** — Registros de depósitos realizados.
- id, user_id, plataforma_id, plataforma_nome, nome_usuario, valor, pix, status, detalhes

**saques** — Solicitações de saque.
- id, user_id, plataforma_id, plataforma_nome, nome_usuario, valor, pix, status, detalhes

**sacs** — Atendimentos/SACs com aprovação.
- id, user_id, plataforma_id, plataforma_nome, nome_usuario, valor, pix, motivo, status

**telegram_config** — Configuração do bot Telegram.
- bot_token, chat_id, ativo, notif_novo_usuario, notif_deposito, notif_saque, etc.

**telegram_eventos** — Eventos personalizáveis com mensagens dinâmicas.
- nome, mensagem, ativo

**logs** — Registro de atividades do sistema.
**notificacoes** — Notificações em tempo real.
**configuracoes** — Configurações gerais do usuário.`,
  },
  {
    icon: Key, color: "neon-green", title: "2. Chaves Dinâmicas dos Eventos",
    content: `As mensagens dos eventos aceitam chaves dinâmicas que são substituídas automaticamente:

**{nome_usuario}** — Nome do usuário envolvido
**{valor}** — Valor monetário (depósito/saque)
**{nome_plataforma}** — Nome da plataforma
**{quantidade_usuarios}** — Quantidade de usuários afetados
**{nome_cooperacao}** — Nome/identificador da cooperação
**{dias}** — Quantidade de dias (ex: dias restantes)

**Eventos padrão:**
- \`novo_usuario\`: "O usuário {nome_usuario} se cadastrou na plataforma {nome_plataforma}."
- \`deposito\`: "O usuário {nome_usuario} fez um depósito de {valor} na plataforma {nome_plataforma}."
- \`plataforma_offline\`: "A plataforma {nome_plataforma} está offline ou caiu."
- \`cooperacao\`: "A cooperação {nome_cooperacao} expirou, removendo {quantidade_usuarios} usuários."
- \`saque\`: "O usuário {nome_usuario} solicitou um saque de {valor} na plataforma {nome_plataforma}."`,
  },
  {
    icon: Send, color: "neon-amber", title: "3. Configurar Telegram Bot",
    content: `**Passo 1:** Abra o Telegram e busque @BotFather.
**Passo 2:** Envie /newbot e siga as instruções para criar um bot.
**Passo 3:** Copie o Bot Token fornecido (ex: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11).
**Passo 4:** Crie um grupo/canal e adicione o bot como administrador.
**Passo 5:** Para obter o Chat ID, envie uma mensagem no grupo e acesse:
  https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
  O chat_id estará no campo "chat":{"id":-1001234567890}
**Passo 6:** Cole o Bot Token e Chat ID na página de Integrações.
**Passo 7:** Clique em "Testar Conexão" para verificar.
**Passo 8:** Configure quais eventos devem enviar notificações.`,
  },
  {
    icon: Server, color: "neon-purple", title: "4. Conectar Banco de Dados Externo",
    content: `Cada plataforma pode ser conectada a um banco de dados MySQL externo para sincronizar dados.

**Campos necessários:**
- db_host: endereço do servidor (ex: 192.168.1.100 ou db.exemplo.com)
- db_port: porta do MySQL (padrão: 3306)
- db_user: usuário do banco
- db_pass: senha do banco
- db_name: nome do banco de dados

**Mapeamento de tabelas:**
- tabela_usuarios: nome da tabela de usuários (padrão: "users")
- tabela_afiliados: nome da tabela de afiliados (padrão: "affiliates")
- tabela_saldo: nome da tabela de saldos (padrão: "wallets")
- coluna_saldo: nome da coluna de saldo (padrão: "balance")

**Importante:** O sistema só permite ativar a plataforma (status: online) se a conexão com o banco estiver funcionando corretamente.`,
  },
  {
    icon: Zap, color: "neon-cyan", title: "5. Cooperações e Remoção Automática",
    content: `O sistema de cooperações permite definir prazos para cada plataforma.

**Como funciona:**
1. Ao cadastrar uma plataforma, defina "Dias de Cooperação" (ex: 30 dias).
2. A data de expiração é calculada automaticamente.
3. Quando a cooperação expira:
   - O badge muda para "Expirada" com visual vermelho
   - Aparece no Dashboard na seção "Cooperações Expirando"
   - O evento "cooperacao" é disparado via Telegram

**Remoção automática:**
- Nas Configurações, ative "Exclusão Automática de Afiliados"
- Quando a cooperação expirar, usuários e afiliados são removidos automaticamente
- Um log é criado registrando a ação`,
  },
  {
    icon: Shield, color: "neon-red", title: "6. Segurança e Boas Práticas",
    content: `**RLS (Row Level Security):** Todas as tabelas possuem políticas de segurança. Cada usuário só acessa seus próprios dados.

**Autenticação:** O sistema usa autenticação por email/senha. Não são permitidos cadastros anônimos.

**Dados sensíveis:** Tokens de bot, senhas de banco e chaves de gateway são armazenados no banco com RLS — nunca ficam expostos no frontend.

**Realtime:** As tabelas de depósitos, saques e SACs possuem realtime habilitado para atualizações em tempo real.

**Backup:** Exporte seus dados regularmente usando os botões de exportação (CSV/PDF) disponíveis no Dashboard e outras páginas.`,
  },
];

const Tutorial = () => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">
          Tutorial <span className="gradient-text">& Documentação</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Guia completo para configurar e utilizar o Master Painel Pro</p>
      </motion.div>

      <div className="space-y-4">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.08 }}
              className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-${section.color}/10`}>
                    <Icon className={`w-5 h-5 text-${section.color}`} />
                  </div>
                  <h2 className="font-bold text-foreground">{section.title}</h2>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  {section.content.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={i} className="font-bold text-sm text-foreground mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
                    }
                    if (line.startsWith("**")) {
                      const parts = line.split("**");
                      return (
                        <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                          {parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="text-foreground">{part}</strong> : part)}
                        </p>
                      );
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
                          <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">{line.slice(2)}</p>
                        </div>
                      );
                    }
                    if (line.trim() === "") return <div key={i} className="h-2" />;
                    return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>;
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Tutorial;
