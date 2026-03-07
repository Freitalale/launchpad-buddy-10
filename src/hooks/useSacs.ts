import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Sac {
  id: string;
  user_id: string;
  plataforma_id: string | null;
  plataforma_nome: string | null;
  nome_usuario: string;
  valor: number | null;
  pix: string | null;
  motivo: string | null;
  status: string;
  created_at: string;
}

export const useSacs = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sacs", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sacs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sac[];
    },
    enabled: !!user,
  });
};

export const useCreateSac = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: Omit<Sac, "id" | "user_id" | "created_at">) => {
      const { data: result, error } = await (supabase as any)
        .from("sacs").insert({ ...data, user_id: user!.id }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sacs"] }),
  });
};

export const useUpdateSac = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string }) => {
      const { error } = await (supabase as any)
        .from("sacs").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sacs"] }),
  });
};
