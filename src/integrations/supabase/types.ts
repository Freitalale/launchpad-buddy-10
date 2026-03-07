export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      configuracoes: {
        Row: {
          cooperacao_dias_padrao: number | null
          created_at: string
          exclusao_automatica_afiliados: boolean | null
          gateway_chave_global: string | null
          id: string
          user_id: string
          webhook_outro_global: string | null
          webhook_telegram_global: string | null
        }
        Insert: {
          cooperacao_dias_padrao?: number | null
          created_at?: string
          exclusao_automatica_afiliados?: boolean | null
          gateway_chave_global?: string | null
          id?: string
          user_id: string
          webhook_outro_global?: string | null
          webhook_telegram_global?: string | null
        }
        Update: {
          cooperacao_dias_padrao?: number | null
          created_at?: string
          exclusao_automatica_afiliados?: boolean | null
          gateway_chave_global?: string | null
          id?: string
          user_id?: string
          webhook_outro_global?: string | null
          webhook_telegram_global?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: string | null
          id: string
          plataforma_id: string | null
          plataforma_nome: string | null
          tipo: string
          user_id: string
          usuario: string | null
          valor: number | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: string | null
          id?: string
          plataforma_id?: string | null
          plataforma_nome?: string | null
          tipo?: string
          user_id: string
          usuario?: string | null
          valor?: number | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: string | null
          id?: string
          plataforma_id?: string | null
          plataforma_nome?: string | null
          tipo?: string
          user_id?: string
          usuario?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      mensagens_personalizadas: {
        Row: {
          ativo: boolean | null
          created_at: string
          evento: string
          id: string
          mensagem: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          evento: string
          id?: string
          mensagem: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          evento?: string
          id?: string
          mensagem?: string
          user_id?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string | null
          plataforma_id: string | null
          plataforma_nome: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          plataforma_id?: string | null
          plataforma_nome?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          plataforma_id?: string | null
          plataforma_nome?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      plataformas: {
        Row: {
          categoria: Database["public"]["Enums"]["platform_category"]
          coluna_saldo: string | null
          cooperacao_dias: number | null
          cooperacao_expira: string | null
          cor: string | null
          created_at: string
          db_host: string | null
          db_name: string | null
          db_pass: string | null
          db_port: number | null
          db_user: string | null
          gateway_chave: string | null
          id: string
          logo: string | null
          nome: string
          saldo_total: number | null
          status: Database["public"]["Enums"]["platform_status"]
          tabela_afiliados: string | null
          tabela_saldo: string | null
          tabela_usuarios: string | null
          total_afiliados: number | null
          total_usuarios: number | null
          ultimo_sync: string | null
          url: string | null
          user_id: string
          webhook_outro: string | null
          webhook_telegram: string | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["platform_category"]
          coluna_saldo?: string | null
          cooperacao_dias?: number | null
          cooperacao_expira?: string | null
          cor?: string | null
          created_at?: string
          db_host?: string | null
          db_name?: string | null
          db_pass?: string | null
          db_port?: number | null
          db_user?: string | null
          gateway_chave?: string | null
          id?: string
          logo?: string | null
          nome: string
          saldo_total?: number | null
          status?: Database["public"]["Enums"]["platform_status"]
          tabela_afiliados?: string | null
          tabela_saldo?: string | null
          tabela_usuarios?: string | null
          total_afiliados?: number | null
          total_usuarios?: number | null
          ultimo_sync?: string | null
          url?: string | null
          user_id: string
          webhook_outro?: string | null
          webhook_telegram?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["platform_category"]
          coluna_saldo?: string | null
          cooperacao_dias?: number | null
          cooperacao_expira?: string | null
          cor?: string | null
          created_at?: string
          db_host?: string | null
          db_name?: string | null
          db_pass?: string | null
          db_port?: number | null
          db_user?: string | null
          gateway_chave?: string | null
          id?: string
          logo?: string | null
          nome?: string
          saldo_total?: number | null
          status?: Database["public"]["Enums"]["platform_status"]
          tabela_afiliados?: string | null
          tabela_saldo?: string | null
          tabela_usuarios?: string | null
          total_afiliados?: number | null
          total_usuarios?: number | null
          ultimo_sync?: string | null
          url?: string | null
          user_id?: string
          webhook_outro?: string | null
          webhook_telegram?: string | null
        }
        Relationships: []
      }
      telegram_config: {
        Row: {
          ativo: boolean
          bot_token: string | null
          chat_id: string | null
          created_at: string
          id: string
          notif_cooperacao: boolean | null
          notif_deposito: boolean | null
          notif_erro: boolean | null
          notif_novo_usuario: boolean | null
          notif_plataforma_offline: boolean | null
          notif_saque: boolean | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          bot_token?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          notif_cooperacao?: boolean | null
          notif_deposito?: boolean | null
          notif_erro?: boolean | null
          notif_novo_usuario?: boolean | null
          notif_plataforma_offline?: boolean | null
          notif_saque?: boolean | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          bot_token?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          notif_cooperacao?: boolean | null
          notif_deposito?: boolean | null
          notif_erro?: boolean | null
          notif_novo_usuario?: boolean | null
          notif_plataforma_offline?: boolean | null
          notif_saque?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      telegram_eventos: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          mensagem: string
          nome: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          mensagem: string
          nome: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          mensagem?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      platform_category:
        | "chinese"
        | "brazilian"
        | "esports"
        | "casino"
        | "sports"
        | "other"
      platform_status: "online" | "offline" | "error" | "warning"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      platform_category: [
        "chinese",
        "brazilian",
        "esports",
        "casino",
        "sports",
        "other",
      ],
      platform_status: ["online", "offline", "error", "warning"],
    },
  },
} as const
