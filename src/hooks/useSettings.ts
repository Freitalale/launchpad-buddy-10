import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Configuracao = Tables<"configuracoes">;

export const useSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["configuracoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Configuracao;
    },
    enabled: !!user,
  });
};

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<TablesUpdate<"configuracoes">>) => {
      const { error } = await supabase
        .from("configuracoes")
        .update(data)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["configuracoes"] }),
  });
};
