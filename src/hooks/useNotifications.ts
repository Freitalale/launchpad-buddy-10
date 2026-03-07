import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface Notificacao {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string;
  lida: boolean;
  plataforma_id: string | null;
  plataforma_nome: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notificacoes-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes" }, () => {
        qc.invalidateQueries({ queryKey: ["notificacoes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["notificacoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notificacao[];
    },
    enabled: !!user,
  });
};

export const useUnreadCount = () => {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter(n => !n.lida).length;
};

export const useCreateNotification = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { titulo: string; mensagem?: string; tipo?: string; plataforma_id?: string; plataforma_nome?: string }) => {
      const { error } = await supabase
        .from("notificacoes")
        .insert({ ...data, user_id: user!.id, tipo: data.tipo ?? "info" } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
};

export const useMarkAsRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
};

export const useMarkAllAsRead = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true } as any)
        .eq("user_id", user!.id)
        .eq("lida", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
};
