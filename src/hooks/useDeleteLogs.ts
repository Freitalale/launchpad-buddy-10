import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useDeleteLogs = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (mode: "today" | "all" | { date: string }) => {
      if (!user) throw new Error("Não autenticado");

      let query = supabase.from("logs").delete().eq("user_id", user.id);

      if (mode === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte("created_at", today.toISOString());
      } else if (mode !== "all" && typeof mode === "object" && mode.date) {
        const start = new Date(mode.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(mode.date);
        end.setHours(23, 59, 59, 999);
        query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });
};
