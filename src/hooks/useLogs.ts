import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Log = Tables<"logs">;
export type LogInsert = TablesInsert<"logs">;

export const useLogs = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Log[];
    },
    enabled: !!user,
  });
};

export const useCreateLog = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<LogInsert, "user_id">) => {
      const { error } = await supabase
        .from("logs")
        .insert({ ...data, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });
};
